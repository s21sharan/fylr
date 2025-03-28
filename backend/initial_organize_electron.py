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
You will be provided with list of source files and a summary of their contents. Organize all the files into a directory structure that optimally organizes the files using known conventions and best practices.
Follow good naming conventions.

- Group files by content type into categories such as "images", "recipes", "travel", "school", "work", "home", etc.
- try to group as many files as you can into the same category
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

def generate_file_structure(file_summaries, client):
    """Generate a proposed file structure based on file summaries"""
    try:
        # Convert the file summaries to JSON
        summaries_json = json.dumps(file_summaries, indent=2)
        
        # Print what we're sending to Mistral
        print("\n" + "=" * 50)
        print("GENERATING FILE STRUCTURE FROM SUMMARIES:")
        print("=" * 50)
        
        # Print the prompt and data being sent to the LLM
        print("PROMPT:")
        print(FILE_PROMPT)
        print("\nDATA:")
        print(summaries_json)
        print("=" * 50)
        
        # Send to Mistral and get proposed structure
        response = client.chat(
            model='mistral',
            messages=[
                {"role": "system", "content": FILE_PROMPT},
                {"role": "user", "content": summaries_json}
            ],
            options={"temperature": 0, "num_predict": 2048}  # Increased token limit for complex structures
        )
        
        # Get the response content
        response_content = response['message']['content'].strip()
        
        # Try to parse the JSON response
        try:
            # Extract JSON from the response
            json_start = response_content.find('{')
            json_end = response_content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_content[json_start:json_end]
                result = json.loads(json_str)
                return result["files"]
            else:
                print("Error: Could not find valid JSON in response")
                print(response_content)
                return None
        except Exception as e:
            print(f"Error parsing response: {str(e)}")
            print(response_content)
            return None
    except Exception as e:
        print(f"Error generating file structure: {str(e)}")
        return None

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

def analyze_and_organize_files():
    # Ask user for directory path
    directory = input("Please enter the directory path: ").strip()
    
    # Check if directory exists
    if not os.path.isdir(directory):
        print("Error: Directory does not exist!")
        return
    
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
    
    # Check for duplicates
    print("\nChecking for duplicate files...")
    file_hashes = {}
    duplicates = {}
    
    for file_path in files_to_process:
        file_hash = get_file_hash(file_path)
        if file_hash in file_hashes:
            if file_hash not in duplicates:
                duplicates[file_hash] = [file_hashes[file_hash]]
            duplicates[file_hash].append(file_path)
        else:
            file_hashes[file_path] = file_path
    
    # Handle duplicates if found
    if duplicates:
        print("\nDuplicate files found:")
        for file_hash, duplicate_files in duplicates.items():
            print("\nDuplicate set:")
            for i, file_path in enumerate(duplicate_files, 1):
                print(f"{i}. {file_path}")
        
        response = input("\nWould you like to remove duplicate files? (y/n): ").lower()
        if response == 'y':
            for file_hash, duplicate_files in duplicates.items():
                print(f"\nDuplicate set:")
                for i, file_path in enumerate(duplicate_files, 1):
                    print(f"{i}. {file_path}")
                keep_index = int(input("Enter the number of the file to keep (others will be removed): ")) - 1
                
                # Remove all files except the one to keep
                for i, file_path in enumerate(duplicate_files):
                    if i != keep_index:
                        try:
                            os.remove(file_path)
                            print(f"Removed: {file_path}")
                            # Remove from files_to_process
                            files_to_process.remove(file_path)
                        except Exception as e:
                            print(f"Error removing {file_path}: {str(e)}")
    
    # Load existing summaries from CSV if it exists
    summaries_cache = {}
    csv_path = os.path.join(os.getcwd(), "file_summaries_cache.csv")
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    # Store with file hash as key
                    summaries_cache[row['file_hash']] = {
                        'summary': row['summary'],
                        'file_path': row['file_path'],
                        'last_modified': float(row['last_modified'])
                    }
            print(f"Loaded {len(summaries_cache)} cached file summaries.")
        except Exception as e:
            print(f"Error loading summaries cache: {str(e)}")
    
    # Analyze files - main functionality
    print("\nAnalyzing files:")
    
    # Store file summaries
    file_summaries = []
    new_or_updated_summaries = []
    
    for file_path in files_to_process:
        print(f"\nAnalyzing: {file_path}")
        
        # Calculate file hash and get last modified time
        file_hash = get_file_hash(file_path)
        last_modified = os.path.getmtime(file_path)
        
        # Check if we have a cached summary for this file hash 
        # and if the file hasn't been modified since
        use_cached = False
        if file_hash in summaries_cache:
            cached_entry = summaries_cache[file_hash]
            if float(cached_entry['last_modified']) >= last_modified:
                summary = cached_entry['summary']
                print(f"Using cached summary")
                use_cached = True
            
        # If not in cache or file was modified, generate a new summary
        if not use_cached:
            summary = get_file_summary(file_path, client)
            if summary:
                # Add to new/updated summaries list for CSV update
                new_or_updated_summaries.append({
                    'file_hash': file_hash,
                    'file_path': file_path,
                    'summary': summary,
                    'last_modified': last_modified
                })
        
        if summary:
            # Print summary immediately after analyzing each file
            print(f"Summary: {summary}")
            
            # Generate a filename based on the summary
            suggested_filename = generate_file_name(client, summary)
            print(f"Suggested filename: {suggested_filename}")
            print("-" * 50)
            
            # Store the file summary
            file_summaries.append({
                "file_path": file_path,
                "summary": summary
            })
    
    # Update the CSV cache with new or updated summaries
    if new_or_updated_summaries:
        try:
            # Create or append to the CSV file
            file_exists = os.path.exists(csv_path)
            
            with open(csv_path, 'a', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['file_hash', 'file_path', 'summary', 'last_modified']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                # Write header if file doesn't exist
                if not file_exists:
                    writer.writeheader()
                
                # Write new or updated entries
                for entry in new_or_updated_summaries:
                    writer.writerow(entry)
            
            print(f"Updated cache with {len(new_or_updated_summaries)} new or modified file summaries.")
        except Exception as e:
            print(f"Error updating summaries cache: {str(e)}")
    
    # Generate file structure if we have summaries
    if file_summaries:
        # Convert the file summaries to JSON
        summaries_json = json.dumps(file_summaries, indent=2)
        
        # Print what we're sending to Mistral
        print("\n" + "=" * 50)
        print("GENERATING FILE STRUCTURE FROM SUMMARIES:")
        print("=" * 50)
        
        # Print the prompt and data being sent to the LLM
        print("PROMPT:")
        print(FILE_PROMPT)
        print("\nDATA:")
        print(summaries_json)
        print("=" * 50)
        
        # Send to Mistral and get raw response
        response = client.chat(
            model='mistral',
            messages=[
                {"role": "system", "content": FILE_PROMPT},
                {"role": "user", "content": summaries_json}
            ],
            options={"temperature": 0, "num_predict": 2048}
        )
        
        # Print the raw response
        print("\n" + "=" * 50)
        print("RAW LLM RESPONSE:")
        print("=" * 50)
        print(response['message']['content'])
        print("=" * 50)
        
        # Parse the response to get file structure
        response_content = response['message']['content'].strip()
        file_structure = None
        
        try:
            # Extract JSON from the response
            json_start = response_content.find('{')
            json_end = response_content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_content[json_start:json_end]
                result = json.loads(json_str)
                file_structure = result["files"]
        except Exception as e:
            print(f"Error parsing response: {str(e)}")
            print("Failed to generate file structure proposal.")
            return
        
        # Ask if user wants to apply changes
        if file_structure:
            response = input("\nWould you like to apply these changes? (y/n): ").lower()
            if response == 'y':
                # Apply the changes
                for file_info in file_structure:
                    src_path = file_info['src_path']
                    dst_path = file_info['dst_path']
                    
                    # Create destination directory if it doesn't exist
                    dst_dir = os.path.dirname(dst_path)
                    os.makedirs(dst_dir, exist_ok=True)
                    
                    # Move and rename file
                    try:
                        os.rename(src_path, dst_path)
                        print(f"Moved: {os.path.basename(src_path)} -> {dst_path}")
                    except Exception as e:
                        print(f"Error moving {os.path.basename(src_path)}: {str(e)}")
                
                print("Files have been reorganized according to the proposed structure.")
            else:
                print("No changes were made.")
        else:
            print("Failed to generate file structure proposal.")
    else:
        print("No files were successfully processed")
        
def analyze_directory(directory_path):
    """Analyze the directory and return the file structure data"""
    logger.info(f"Starting directory analysis: {directory_path}")
    
    # Initialize Ollama client
    logger.debug("Initializing Ollama client")
    client = Client(host="http://localhost:11434")
    
    # Initialize lists for files and their summaries
    files_to_process = []
    
    # Walk through directory
    logger.debug(f"Scanning directory for files: {directory_path}")
    for root, _, files in os.walk(directory_path):
        for file in files:
            file_path = os.path.join(root, file)
            if file.lower().endswith(('.pdf', '.txt')) or is_image_file(file_path):
                files_to_process.append(file_path)
    
    logger.info(f"Found {len(files_to_process)} files to process")
    
    # Check for duplicates
    logger.debug("Checking for duplicate files")
    file_hashes = {}
    duplicates = {}
    
    for file_path in files_to_process:
        file_hash = get_file_hash(file_path)
        if file_hash in file_hashes:
            logger.debug(f"Duplicate found: {file_path} matches {file_hashes[file_hash]}")
            if file_hash not in duplicates:
                duplicates[file_hash] = [file_hashes[file_hash]]
            duplicates[file_hash].append(file_path)
        else:
            file_hashes[file_path] = file_path
    
    logger.info(f"Found {len(duplicates)} duplicate file sets")
    
    # Load existing summaries from CSV if it exists
    logger.debug("Loading cached file summaries")
    summaries_cache = {}
    csv_path = os.path.join(os.getcwd(), "file_summaries_cache.csv")
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    if all(field in row for field in ['file_hash', 'summary', 'file_path', 'last_modified']):
                        # Store with file hash as key
                        summaries_cache[row['file_hash']] = {
                            'summary': row['summary'],
                            'file_path': row['file_path'],
                            'last_modified': float(row['last_modified'])
                        }
            print(f"Loaded {len(summaries_cache)} cached file summaries.")
        except Exception as e:
            print(f"Error loading summaries cache: {str(e)}")
    
    # Analyze files - main functionality
    logger.info("Starting file analysis")
    file_summaries = []
    new_or_updated_summaries = []
    
    for file_path in files_to_process:
        print(f"\nAnalyzing: {file_path}")
        
        # Calculate file hash and get last modified time
        file_hash = get_file_hash(file_path)
        last_modified = os.path.getmtime(file_path)
        
        # Check if we have a cached summary for this file hash 
        # and if the file hasn't been modified since
        use_cached = False
        if file_hash in summaries_cache:
            cached_entry = summaries_cache[file_hash]
            if float(cached_entry['last_modified']) >= last_modified:
                summary = cached_entry['summary']
                print(f"Using cached summary")
                use_cached = True
            
        # If not in cache or file was modified, generate a new summary
        if not use_cached:
            summary = get_file_summary(file_path, client)
            if summary:
                # Add to new/updated summaries list for CSV update
                new_or_updated_summaries.append({
                    'file_hash': file_hash,
                    'file_path': file_path,
                    'summary': summary,
                    'last_modified': last_modified
                })
        
        if summary:
            # Print summary immediately after analyzing each file
            print(f"Summary: {summary}")
            
            # Store the file summary
            file_summaries.append({
                "file_path": file_path,
                "summary": summary
            })
    
    # Update the CSV cache with new or updated summaries
    if new_or_updated_summaries:
        try:
            # Create or append to the CSV file
            file_exists = os.path.exists(csv_path)
            
            with open(csv_path, 'a', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['file_hash', 'file_path', 'summary', 'last_modified']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                # Write header if file doesn't exist
                if not file_exists:
                    writer.writeheader()
                
                # Write new or updated entries
                for entry in new_or_updated_summaries:
                    writer.writerow(entry)
            
            print(f"Updated cache with {len(new_or_updated_summaries)} new or modified file summaries.")
        except Exception as e:
            print(f"Error updating summaries cache: {str(e)}")
    
    # Generate file structure if we have summaries
    if file_summaries:
        logger.info(f"Generating file structure from {len(file_summaries)} file summaries")
        # Convert the file summaries to JSON
        summaries_json = json.dumps(file_summaries, indent=2)
        
        # Print what we're sending to Mistral
        print("\nGENERATING FILE STRUCTURE FROM SUMMARIES:")
        
        # Send to Mistral and get raw response
        response = client.chat(
            model='mistral',
            messages=[
                {"role": "system", "content": FILE_PROMPT},
                {"role": "user", "content": summaries_json}
            ],
            options={"temperature": 0, "num_predict": 2048}
        )
        
        # Print the raw response
        print("\nRAW LLM RESPONSE:")
        print(response['message']['content'])
        
        return response['message']['content']
    
    logger.warning("No valid file summaries found, returning empty structure")
    return json.dumps({"files": []})

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing configuration file path")
        sys.exit(1)
        
    config_path = sys.argv[1]
    
    try:
        with open(config_path, 'r') as config_file:
            config = json.load(config_file)
            directory = config.get('directory')
            
            if not directory or not os.path.isdir(directory):
                print("Error: Invalid directory path")
                sys.exit(1)
                
            result = analyze_directory(directory)
            print(result)
            
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)