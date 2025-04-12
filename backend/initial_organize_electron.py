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
import moondream as md
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('file_organizer')

FILE_PROMPT = """
You are a file organization assistant that MUST organize files based on their content and the specified specificity level.

CRITICAL RULES:
1. Use EXACTLY ONE level of nesting - no subfolders allowed
2. Each file must be placed in EXACTLY ONE category - NO duplicates allowed
3. Follow the specificity level EXACTLY as specified - this is CRITICAL
4. Category names must use underscores between words
5. Do not include the base directory in paths
6. Return ONLY valid JSON in the specified format

SPECIFICITY LEVELS - YOU MUST FOLLOW THESE EXACTLY:

Level 1 (Broadest):
- Use ONLY these 4 categories: Documents, Images, Videos, Audio
- NO exceptions, NO other categories allowed
- Every file MUST go into one of these 4 categories
Example structure:
Documents/report.pdf
Images/photo.jpg
Videos/clip.mp4
Audio/song.mp3

Level 2 (Basic):
- Use broad, general-purpose categories only
- Each category MUST be a single word
- Examples: Work, Personal, School, Projects, Media
- NO compound words or underscores allowed
- NO dates or specific details in names
Example structure:
Work/report.pdf
School/homework.pdf
Personal/photo.jpg
Media/video.mp4

Level 3 (Standard):
- Use descriptive categories based on content type
- Can use compound words with underscores
- Focus on general purpose or content type
- NO dates or specific contexts
Example structure:
Financial_Documents/budget.xlsx
Travel_Photos/vacation.jpg
Programming_Projects/code.py
Recipe_Collection/cake.pdf

Level 4 (Detailed):
- Use specific categories that describe content precisely
- Must include both content type and purpose
- Use compound words with underscores
- Can include general context but NO specific dates
Example structure:
Tax_Documents_2023/return.pdf
Work_Project_Reports/status.pdf
Vacation_Photos_Italy/beach.jpg
Programming_Python_Projects/app.py

Level 5 (Most Specific):
- Create unique categories for each distinct type of content
- Include dates, locations, events, and specific context
- Make each category name as descriptive as possible
- Separate similar content by specific attributes
Example structure:
Tax_Returns_2023_Q1/document.pdf
Italy_Vacation_Photos_Summer_2023/beach.jpg
Python_Web_Project_Login_System/code.py
Birthday_Party_Photos_July_2023/cake.jpg

Your response must be a JSON object with this exact schema:
{
    "files": [
        {
            "src_path": "original file path",
            "dst_path": "category/filename.ext"
        }
    ]
}
""".strip()

def is_image_file(file_path):
    """Check if a file is an image based on its mimetype"""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type and mime_type.startswith('image/')

def classify_image(file_path, client):
    """Classify the contents of an image file using Moondream model"""
    logger.debug(f"Starting image classification for: {file_path}")
    try:
        # Load the image
        logger.debug(f"Loading image: {file_path}")
        image = Image.open(file_path)
        
        # Initialize Moondream model
        logger.debug("Initializing Moondream model")
        model = md.vl(model="/Users/sharans/Downloads/moondream-0_5b-int8.mf")
        
        # Encode the image
        logger.debug("Encoding image")
        encoded_image = model.encode_image(image)
        
        # Generate caption
        logger.debug("Generating caption")
        caption = model.caption(encoded_image)["caption"]
        logger.debug(f"Generated caption: {caption}")
        
        # Format the response
        if caption:
            result = f"Image containing {caption.lower()}"
            logger.debug(f"Final classification result: {result}")
            return result
        else:
            result = f"Image file from {os.path.basename(file_path)}"
            logger.debug(f"No valid caption, using fallback: {result}")
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
        
        # Simple, focused prompt that emphasizes content-based organization
        prompt = """You are a file organization assistant. Organize these files into categories based on their content.

CRITICAL RULES:
1. Each file MUST be categorized based on its actual content, not just file type
2. Files with similar content should be grouped together
3. Use underscores between words in category names
4. Never put all files in one category
5. Create focused, specific categories that describe the content

Examples of good categories:
- Technical_Documentation (for technical guides, manuals)
- Personal_Finance (for budgets, financial docs)
- Travel_Photos (for travel-related images)
- Work_Projects (for work-related files)
- Recipe_Collection (for cooking recipes)
- Meeting_Notes (for meeting documents)
- System_Backups (for backup files)
- Code_Projects (for programming files)

The specificity level ({level}) determines how detailed the categories should be:
Level 1: Very broad categories (e.g., Documents, Images)
Level 2: General purpose categories (e.g., Work, Personal)
Level 3: Content-based categories (e.g., Recipes, Travel_Photos)
Level 4: Detailed categories (e.g., Italian_Recipes, Japan_Travel_Photos)
Level 5: Very specific categories (e.g., Italian_Dinner_Recipes_2023)

Return a JSON structure like this:
{{
    "files": [
        {{
            "src_path": "original/path/file.ext",
            "dst_path": "category_name/file.ext"
        }}
    ]
}}"""

        # Send to LLM with temperature scaled by specificity
        temperature = min((specificity - 1) * 0.1, 0.4)
        
        response = client.chat(
            model='mistral',
            messages=[
                {"role": "system", "content": prompt.format(level=specificity)},
                {"role": "user", "content": f"Organize these files based on their content summaries. Create appropriate categories for level {specificity}:\n{summaries_json}"}
            ],
            options={"temperature": temperature, "num_predict": 2048}
        )
        
        # Extract and validate JSON response
        response_content = response['message']['content'].strip()
        json_start = response_content.find('{')
        json_end = response_content.rfind('}')
        
        if json_start >= 0 and json_end > json_start:
            json_str = response_content[json_start:json_end + 1]
            result = json.loads(json_str)
            file_structure = result.get("files", [])
            
            # Remove duplicates while preserving order
            seen_files = set()
            unique_structure = []
            for file in file_structure:
                src_path = file['src_path']
                if src_path not in seen_files:
                    seen_files.add(src_path)
                    unique_structure.append(file)
            
            # Check if all files are in one category
            categories = set(os.path.dirname(file['dst_path']) for file in unique_structure)
            
            if len(categories) == 1 and specificity > 1:
                # Retry with explicit content-based categorization
                logger.warning("All files in one category - retrying with content-based categorization")
                
                # Group files by content type
                content_groups = {}
                for file in unique_structure:
                    src_path = file['src_path']
                    summary = next((s["summary"] for s in file_summaries if s["file_path"] == src_path), "").lower()
                    
                    # Determine content type from summary
                    if any(word in summary for word in ['recipe', 'cooking', 'food']):
                        content_type = 'Recipes'
                    elif any(word in summary for word in ['travel', 'guide', 'city', 'destination']):
                        content_type = 'Travel'
                    elif any(word in summary for word in ['code', 'programming', 'software']):
                        content_type = 'Code'
                    elif any(word in summary for word in ['photo', 'image', 'picture']):
                        content_type = 'Photos'
                    elif any(word in summary for word in ['document', 'report', 'paper']):
                        content_type = 'Documents'
                    elif any(word in summary for word in ['finance', 'budget', 'invoice']):
                        content_type = 'Finance'
                    elif any(word in summary for word in ['note', 'meeting', 'memo']):
                        content_type = 'Notes'
                    else:
                        content_type = 'Other'
                    
                    if content_type not in content_groups:
                        content_groups[content_type] = []
                    content_groups[content_type].append((file, summary))
                
                # Create new structure with appropriate categories
                new_structure = []
                for content_type, files in content_groups.items():
                    for file, summary in files:
                        filename = os.path.basename(file['src_path'])
                        
                        # Generate category based on content and specificity
                        if specificity <= 2:
                            category = content_type
                        elif specificity == 3:
                            # Add context to category
                            if 'recipe' in summary:
                                category = 'Cooking_Recipes'
                            elif 'travel' in summary:
                                category = 'Travel_Guides'
                            elif 'photo' in summary:
                                category = 'Travel_Photos'
                            else:
                                category = f"{content_type}_Collection"
                        else:  # specificity >= 4
                            # Add more specific context
                            if 'italian' in summary and 'recipe' in summary:
                                category = 'Italian_Recipes'
                            elif 'japan' in summary and 'travel' in summary:
                                category = 'Japan_Travel_Guides'
                            elif 'vacation' in summary and 'photo' in summary:
                                category = 'Vacation_Photos_2023'
                            else:
                                category = f"{content_type}_Collection_{2023}"
                        
                        new_structure.append({
                            "src_path": file['src_path'],
                            "dst_path": f"{category}/{filename}"
                        })
                
                return new_structure
            
            # For Level 1, ensure only basic categories
            if specificity == 1:
                return adjust_categories_for_level_1(unique_structure)
            
            return unique_structure
            
        else:
            logger.error("Could not find valid JSON in response")
            return []
            
    except Exception as e:
        logger.error(f"Error generating file structure: {str(e)}")
        return []

def adjust_categories_for_level_1(file_structure):
    """Ensure only the 4 basic categories are used for Level 1"""
    allowed_categories = {'Documents', 'Images', 'Videos', 'Audio'}
    adjusted_structure = []
    
    for file in file_structure:
        src_path = file['src_path']
        filename = os.path.basename(src_path)
        
        # Determine basic category based on file extension
        if src_path.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
            category = 'Images'
        elif src_path.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
            category = 'Videos'
        elif src_path.lower().endswith(('.mp3', '.wav', '.aac', '.ogg')):
            category = 'Audio'
        else:
            category = 'Documents'
        
        adjusted_structure.append({
            'src_path': src_path,
            'dst_path': f"{category}/{filename}"
        })
    
    return adjusted_structure

def limit_categories(file_structure, max_categories):
    """Limit the number of categories by combining less common ones"""
    # Count files per category
    category_counts = {}
    for file in file_structure:
        category = os.path.dirname(file['dst_path'])
        category_counts[category] = category_counts.get(category, 0) + 1
    
    # Get top categories
    top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:max_categories]
    top_category_names = set(cat for cat, _ in top_categories)
    
    # Adjust structure
    adjusted_structure = []
    for file in file_structure:
        src_path = file['src_path']
        filename = os.path.basename(file['dst_path'])
        category = os.path.dirname(file['dst_path'])
        
        if category not in top_category_names:
            category = 'Other'
        
        adjusted_structure.append({
            'src_path': src_path,
            'dst_path': f"{category}/{filename}"
        })
    
    return adjusted_structure

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