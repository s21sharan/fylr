import os
import sys
import json
from pathlib import Path
import logging
from ollama import Client
import csv
from initial_organize_electron import get_file_summary, generate_file_name

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('file_renamer')

def generate_filenames(files):
    """Generate new filenames for the given files"""
    try:
        # Initialize Ollama client
        client = Client(host='http://localhost:11434')
        
        generated_names = {}
        for file in files:
            file_path = file['path']
            extension = os.path.splitext(file['name'])[1]
            
            # Get file summary using the function from initial_organize_electron.py
            summary = get_file_summary(file_path, client)
            if not summary:
                logger.warning(f"No summary found for {file['name']}, skipping")
                continue
            
            # Generate new filename using the function from initial_organize_electron.py
            new_base = generate_file_name(client, summary)
            if not new_base:
                logger.warning(f"Could not generate filename for {file['name']}, skipping")
                continue
            
            generated_names[file['name']] = f"{new_base}{extension}"
            
        return {
            "success": True,
            "generated_names": generated_names
        }
        
    except Exception as e:
        logger.error(f"Error generating filenames: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def rename_files(files, new_names):
    """Rename files using the provided new names"""
    try:
        results = []
        for file in files:
            file_path = file['path']
            new_name = new_names.get(file['name'])
            
            if not new_name or new_name == file['name']:
                continue
                
            # Ensure unique filename
            directory = os.path.dirname(file_path)
            base, ext = os.path.splitext(new_name)
            counter = 1
            while os.path.exists(os.path.join(directory, new_name)):
                new_name = f"{base}_{counter}{ext}"
                counter += 1
            
            # Rename the file
            new_path = os.path.join(directory, new_name)
            os.rename(file_path, new_path)
            
            results.append({
                "original": file['name'],
                "new": new_name
            })
            
        return {
            "success": True,
            "renamed_files": results
        }
        
    except Exception as e:
        logger.error(f"Error renaming files: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python rename_files.py <config_path>")
        sys.exit(1)
        
    config_path = sys.argv[1]
    with open(config_path, 'r') as f:
        config = json.load(f)
        
    if 'action' not in config:
        print("Error: 'action' not specified in config")
        sys.exit(1)
        
    if config['action'] == 'generate':
        result = generate_filenames(config['files'])
    elif config['action'] == 'rename':
        result = rename_files(config['files'], config['new_names'])
    else:
        print(f"Error: Unknown action '{config['action']}'")
        sys.exit(1)
        
    print(json.dumps(result)) 