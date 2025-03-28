import os
import sys
import json
from pathlib import Path
import PyPDF2
from ollama import Client
from PIL import Image
import mimetypes
import hashlib
import csv
import time
from transformers import AutoImageProcessor, AutoModelForImageClassification
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('file_organizer')

FILE_PROMPT = """
You will be provided with list of source files and a summary of their contents. Organize all the files into a directory structure that optimally organizes the files using known conventions and best practices.
Follow good naming conventions.

- Group files by content type into categories such as "images", "recipes", "travel", "school", "work", "home", etc.
- The specificity level (1-5) determines how detailed the categorization should be:
  - Level 1: Very broad categories (e.g., "Documents", "Images", "Videos")
  - Level 2: Basic categories (e.g., "Work", "Personal", "School")
  - Level 3: Standard categories (e.g., "Financial", "Recipes", "Travel")
  - Level 4: Detailed categories (e.g., "Tax_Documents", "Dessert_Recipes", "Vacation_Photos")
  - Level 5: Very specific categories (e.g., "2023_Tax_Returns", "Chocolate_Cake_Recipes", "Paris_Vacation_2023")
- Use EXACTLY ONE level of nesting in the directory structure. No subfolders allowed.
- All files must be placed directly into their category folder without any additional subfolder structure.

use this as an EXAMPLE for organization:
-Financial
    -2023_Budget_Spreadsheet.xlsx
-Recipes
    -Chocolate_Cake_Recipe.pdf
-School
    -Math_Homework_Solutions.pdf
    -Research_Paper_Draft.docx
    -Academic_Journal_Article.pdf
    -Convolutional_Neural_Networks_Research_Paper.pdf
-Photos
    -Cityscape_Sunset_May_17_2023.jpg
    -Morning_Coffee_Shop_May_16_2023.jpg
    -Office_Team_Lunch_May_15_2023.jpg
-Travel
    -Summer_Vacation_Itinerary_2023.docx
-Work
    -Project_X_Proposal_Draft.docx
    -Quarterly_Sales_Report.pdf
    -Marketing_Strategy_Presentation.pptx

Your response must be a JSON object with the following schema:
```json
{
    "files": [
        {
            "src_path": "original file path",
            "dst_path": "category/filename.ext"
        }
    ]
}
```

IMPORTANT: The dst_path should be RELATIVE paths with just the category folder and filename, NOT absolute paths. Do not include the base directory in dst_path.
""".strip()

def is_image_file(file_path):
    """Check if a file is an image based on its mimetype"""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type and mime_type.startswith('image/')

def classify_image(file_path, client):
    """Classify the contents of an image file using Google ViT model from Hugging Face"""
    logger.debug(f"Starting image classification for: {file_path}")
    try:
        # Load the image
        logger.debug(f"Loading image: {file_path}")
        image = Image.open(file_path)
        
        # Initialize the ViT model and processor
        logger.debug("Initializing ViT model and processor")
        processor = AutoImageProcessor.from_pretrained("google/vit-base-patch16-224")
        model = AutoModelForImageClassification.from_pretrained("google/vit-base-patch16-224")
        
        # Process the image and get predictions
        logger.debug("Processing image and generating predictions")
        inputs = processor(images=image, return_tensors="pt")
        outputs = model(**inputs)
        logits = outputs.logits
        
        # Get the predicted class
        predicted_class_idx = logits.argmax(-1).item()
        predicted_class = model.config.id2label[predicted_class_idx]
        logger.debug(f"Predicted class: {predicted_class} (idx: {predicted_class_idx})")
        
        # Format the response
        description = predicted_class.replace('_', ' ')
        
        # Format the response similar to how you did with Moondream
        if description:
            result = f"Image containing {description.lower()}"
            logger.debug(f"Final classification result: {result}")
            return result
        else:
            result = f"Image file from {os.path.basename(file_path)}"
            logger.debug(f"No valid description, using fallback: {result}")
            return result
    except Exception as e:
        logger.error(f"Error classifying image {file_path}: {str(e)}", exc_info=True)
        result = f"Image file from {os.path.basename(file_path)}"
        logger.debug(f"Using fallback due to error: {result}")
        return result

def generate_file_name(client, summary, max_length=30):
    """Generate a very concise file name based on the file summary"""
    # Create a JSON format prompt
    prompt = {
        "task": "filename_generation",
        "instruction": "You are given the summary of the contents of a file. Generate an extremely concise filename (2-4 words maximum) with underscores between words. Use general naming conventions. Do not include the file extension.",
        "parameters": {
            "max_length": max_length,
            "format": "lowercase_with_underscores",
            "max_words": 3,
            "special_characters": "none",
            "word_separator": "_"
        },
        "summary": summary
    }
    
    response = client.chat(
        model='mistral',
        messages=[{'role': 'user', 'content': json.dumps(prompt)}]
    )
    
    # Clean up the response to ensure consistent formatting with underscores
    filename = response['message']['content'].strip()
    
    # Split by any whitespace and join with underscores
    words = [word.strip().lower() for word in filename.split() if word.strip()]
    filename = '_'.join(words)
    
    # Remove any non-alphanumeric characters except underscores
    filename = ''.join(c for c in filename if c.isalnum() or c == '_')
    
    # If there are no underscores in the filename, add them between words
    if '_' not in filename and len(filename) > 3:
        # Try to identify word boundaries in camelCase or lowercase run-on words
        new_filename = ''
        for i, char in enumerate(filename):
            if i > 0 and char.isupper():
                new_filename += '_' + char.lower()
            else:
                new_filename += char.lower()
        filename = new_filename
    
    # Remove consecutive underscores
    while '__' in filename:
        filename = filename.replace('__', '_')
    
    # Remove leading/trailing underscores
    filename = filename.strip('_')
    
    return filename

def get_file_summary(file_path, client, image_classifier=None):
    """Get summary for a single file"""
    logger.debug(f"Getting summary for file: {file_path}")
    try:
        if is_image_file(file_path):
            logger.debug(f"File is an image: {file_path}")
            if image_classifier:
                logger.debug("Using provided image classifier from monitor.py")
                try:
                    image = Image.open(file_path)
                    result = image_classifier(image)
                    label = result[0]['label'].replace('_', ' ')
                    logger.debug(f"Image classifier result: {label} (score: {result[0]['score']:.4f})")
                    return f"Image containing {label.lower()}"
                except Exception as e:
                    logger.error(f"Error using provided image classifier: {str(e)}", exc_info=True)
                    logger.debug("Falling back to default classify_image method")
                    return classify_image(file_path, client)
            else:
                logger.debug("Using standard classify_image function")
                return classify_image(file_path, client)
        else:
            # Handle text files with logging
            logger.debug(f"File is a text document: {file_path}")
            text = ""
            if file_path.lower().endswith('.pdf'):
                logger.debug("Extracting text from PDF file")
                # Only extract content until we have at least 1000 characters
                with open(file_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text
                            if len(text) >= 1000:
                                # Truncate to 1000 characters and stop extraction
                                text = text[:1000]
                                break
            else:  # .txt file
                logger.debug("Reading text file")
                with open(file_path, 'r', encoding='utf-8') as file:
                    text = file.read(1000)  # Read only the first 1000 characters
            
            if text:
                # Updated prompt requesting JSON response
                prompt = """
You will be provided with the contents of a file along with its metadata. Provide a summary of the contents. The purpose of the summary is to organize files based on their content. To this end provide a concise but informative summary. Make the summary as specific to the file as possible.

Write your response a JSON object with the following schema:

```json
{
    "file_path": "path to the file including name",
    "summary": "summary of the content"
}
```
""".strip()
                
                # Include file path and content in the user message
                file_content = {
                    "file_path": file_path,
                    "content": text  # No need to limit text as we've already limited it to 1000 chars
                }
                
                summary_response = client.chat(
                    model='mistral',
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": json.dumps(file_content)}
                    ],
                    options={"temperature": 0, "num_predict": 256}
                )
                
                # Parse the JSON response
                try:
                    response_content = summary_response['message']['content'].strip()
                    # Extract JSON from the response (in case there's any extra text)
                    json_start = response_content.find('{')
                    json_end = response_content.rfind('}') + 1
                    if json_start >= 0 and json_end > json_start:
                        json_str = response_content[json_start:json_end]
                        result = json.loads(json_str)
                        return result["summary"]
                    else:
                        # Fallback if JSON parsing fails
                        return response_content
                except Exception as e:
                    print(f"Error parsing JSON response: {str(e)}")
                    # Return raw response if JSON parsing fails
                    return summary_response['message']['content'].strip()
            else:
                print("No text extracted from file.")
                return None
    except Exception as e:
        logger.error(f"Error processing {file_path}: {str(e)}", exc_info=True)
        return None

def get_file_hash(file_path):
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read the file in chunks to handle large files efficiently
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def generate_file_structure(file_summaries, client, specificity=3):
    """Generate a proposed file structure based on file summaries"""
    try:
        # Convert the file summaries to JSON
        summaries_json = json.dumps(file_summaries, indent=2)
        
        # Create a more detailed specificity instruction based on the level
        level_instructions = {
            1: "LEVEL 1 (BROADEST):\n- Use ONLY these categories: Documents, Images, Videos, Audio\n- Force all files into these broad categories\n- No subcategories allowed",
            2: "LEVEL 2 (BASIC):\n- Use 8-10 basic categories like Work, Personal, School\n- Group by general purpose\n- Combine similar items",
            3: "LEVEL 3 (STANDARD):\n- Use 12-15 standard categories\n- Balance between broad and specific\n- Categories like Financial, Recipes, Travel",
            4: "LEVEL 4 (DETAILED):\n- Use 15-20 detailed categories\n- Separate distinct content types\n- More specific naming like Tax_Documents, Project_Files",
            5: "LEVEL 5 (MOST SPECIFIC):\n- Use highly specific categories\n- Include dates, types, or contexts\n- No limit on number of categories\n- Maximum detail in naming"
        }
        
        specificity_prompt = f"""
SPECIFICITY LEVEL: {specificity}

{level_instructions.get(specificity, level_instructions[3])}

You MUST follow these specificity rules strictly when organizing the files.
Failing to follow these rules will result in incorrect organization.
"""
        
        # Send to Mistral and get proposed structure
        response = client.chat(
            model='mistral',
            messages=[
                {"role": "system", "content": FILE_PROMPT},
                {"role": "user", "content": specificity_prompt + "\n\n" + summaries_json}
            ],
            options={"temperature": 0, "num_predict": 2048}
        )
        
        # Get the response content
        response_content = response['message']['content'].strip()
        
        # Try to parse the JSON response
        try:
            # Extract JSON from the response (handle both full JSON and embedded JSON cases)
            if response_content.startswith('{'):
                # If it's already valid JSON
                result = json.loads(response_content)
            else:
                # Try to extract JSON from the text
                json_start = response_content.find('{')
                json_end = response_content.rfind('}')
                if json_start >= 0 and json_end > json_start:
                    json_str = response_content[json_start:json_end + 1]
                    result = json.loads(json_str)
                else:
                    print("Error: Could not find valid JSON in response")
                    return []
            
            return result.get("files", [])
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {str(e)}")
            return []
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return []
    except Exception as e:
        print(f"Error generating file structure: {str(e)}")
        return []

def display_file_structure(file_structure):
    """Display the file structure in a readable tree format"""
    if not file_structure:
        print("No file structure to display.")
        return
    
    # Group files by directory
    dir_structure = {}
    for file_info in file_structure:
        dst_path = file_info['dst_path']
        dst_dir = os.path.dirname(dst_path)
        filename = os.path.basename(dst_path)
        
        if dst_dir not in dir_structure:
            dir_structure[dst_dir] = []
        
        dir_structure[dst_dir].append({
            'filename': filename,
            'src_path': file_info['src_path']
        })
    
    # Print the tree structure
    print("\n" + "=" * 50)
    print("PROPOSED FILE STRUCTURE:")
    print("=" * 50)
    print("📁 ROOT")
    
    # Sort directories for consistent display
    sorted_dirs = sorted(dir_structure.keys())
    
    # Print root directory files first if they exist
    if '' in sorted_dirs:
        for file_info in sorted(dir_structure[''], key=lambda x: x['filename']):
            print(f"├── 📄 {file_info['filename']}")
        sorted_dirs.remove('')
    
    # Print the rest of the directories
    for i, directory in enumerate(sorted_dirs):
        is_last_dir = (i == len(sorted_dirs) - 1)
        
        # Get just the directory name (not the full path)
        dir_parts = directory.split('/')
        dir_name = dir_parts[-1] if dir_parts else directory
        
        # Print directory with appropriate connector
        if is_last_dir:
            print(f"└── 📁 {dir_name}")
            prefix = "    "
        else:
            print(f"├── 📁 {dir_name}")
            prefix = "│   "
        
        # Print files in directory
        files = sorted(dir_structure[directory], key=lambda x: x['filename'])
        for j, file_info in enumerate(files):
            is_last_file = (j == len(files) - 1)
            if is_last_file:
                print(f"{prefix}└── 📄 {file_info['filename']}")
            else:
                print(f"{prefix}├── 📄 {file_info['filename']}")

def analyze_directory(directory, specificity=3):
    """Analyze and organize files in the given directory"""
    try:
        # Initialize Ollama client
        client = Client(host="http://localhost:11434")
        
        # Initialize lists for files and their summaries
        files_to_process = []
        
        # Walk through directory
        for root, _, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                if file.lower().endswith(('.pdf', '.txt')) or is_image_file(file_path):
                    files_to_process.append(file_path)
        
        if not files_to_process:
            print("\nRAW LLM RESPONSE:")
            print(json.dumps({"files": [], "error": None}))
            return
        
        # Store file summaries
        file_summaries = []
        
        # Process each file
        for file_path in files_to_process:
            summary = get_file_summary(file_path, client)
            if summary:
                file_summaries.append({
                    "file_path": file_path,
                    "summary": summary
                })
        
        # Generate file structure if we have summaries
        if file_summaries:
            file_structure = generate_file_structure(file_summaries, client, specificity)
            print("\nRAW LLM RESPONSE:")
            print(json.dumps({"files": file_structure if file_structure else [], "error": None}))
            return
        
        # If we get here, return an empty structure
        print("\nRAW LLM RESPONSE:")
        print(json.dumps({"files": [], "error": None}))
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error analyzing directory: {error_msg}", exc_info=True)
        print("\nRAW LLM RESPONSE:")
        print(json.dumps({"files": [], "error": error_msg}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\nRAW LLM RESPONSE:")
        print(json.dumps({"files": [], "error": "Missing configuration file path"}))
        sys.exit(1)
        
    config_path = sys.argv[1]
    
    try:
        with open(config_path, 'r') as config_file:
            config = json.load(config_file)
            directory = config.get('directory')
            specificity = config.get('specificity', 3)
            
            if not directory or not os.path.isdir(directory):
                print("\nRAW LLM RESPONSE:")
                print(json.dumps({"files": [], "error": "Invalid directory path"}))
                sys.exit(1)
                
            analyze_directory(directory, specificity)
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in main: {error_msg}", exc_info=True)
        print("\nRAW LLM RESPONSE:")
        print(json.dumps({"files": [], "error": error_msg}))
        sys.exit(1)