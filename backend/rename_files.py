import os
import sys
import json
from pathlib import Path
import logging
from openai import OpenAI
from ollama import Client
from dotenv import load_dotenv
from file_organizer import get_file_summary, generate_file_name

# Load environment variables
load_dotenv()

# Configure logging to output to both file and console
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Output to console
        logging.FileHandler('rename_files.log')  # Output to file
    ]
)
logger = logging.getLogger('file_renamer')

# Initialize OpenAI client (will be used only in online mode)
try:
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        raise ValueError("OPENAI_API_KEY environment variable is required for online mode")
    openai_client = OpenAI(api_key=openai_api_key)
    logger.info("OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {str(e)}")
    raise

# Initialize Ollama client (will be used only in offline mode)
try:
    ollama_client = Client(host="http://localhost:11434")
    logger.info("Ollama client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Ollama client: {str(e)}")
    raise

def generate_filenames(files, online_mode=True):
    """Generate new filenames for the given files"""
    try:
        logger.info(f"Starting filename generation in {'online' if online_mode else 'offline'} mode")
        logger.info(f"Processing {len(files)} files")
        
        generated_names = {}
        for file in files:
            file_path = file['path']
            extension = os.path.splitext(file['name'])[1]
            
            logger.info(f"Processing file: {file_path}")
            
            # Get file summary using the function from file_organizer.py
            logger.info(f"Getting file summary using {'OpenAI' if online_mode else 'local LLM'}")
            summary = get_file_summary(file_path, online_mode)
            if not summary:
                logger.warning(f"No summary found for {file['name']}, skipping")
                continue
            
            logger.info(f"Generated summary: {summary}")
            
            # Generate new filename using the function from file_organizer.py
            logger.info(f"Generating filename using {'OpenAI' if online_mode else 'local LLM'}")
            new_base = generate_file_name(summary, online_mode=online_mode)
            if not new_base:
                logger.warning(f"Could not generate filename for {file['name']}, skipping")
                continue
            
            logger.info(f"Generated new base name: {new_base}")
            generated_names[file['name']] = f"{new_base}{extension}"
            
        logger.info(f"Successfully generated names for {len(generated_names)} files")
        return {
            "success": True,
            "generated_names": generated_names
        }
        
    except Exception as e:
        logger.error(f"Error generating filenames: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

def rename_files(files, new_names):
    """Rename files using the provided new names"""
    try:
        logger.info(f"Starting file renaming process for {len(files)} files")
        results = []
        for file in files:
            file_path = file['path']
            new_name = new_names.get(file['name'])
            
            if not new_name or new_name == file['name']:
                logger.info(f"Skipping {file['name']} - no new name provided or name unchanged")
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
            logger.info(f"Renamed {file['name']} to {new_name}")
            
            results.append({
                "original": file['name'],
                "new": new_name
            })
            
        logger.info(f"Successfully renamed {len(results)} files")
        return {
            "success": True,
            "renamed_files": results
        }
        
    except Exception as e:
        logger.error(f"Error renaming files: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    logger.info("Starting rename_files.py script")
    
    if len(sys.argv) != 2:
        logger.error("Usage: python rename_files.py <config_path>")
        sys.exit(1)
        
    config_path = sys.argv[1]
    logger.info(f"Loading configuration from: {config_path}")
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
            logger.info(f"Configuration loaded: {json.dumps(config, indent=2)}")
        
        if 'action' not in config:
            logger.error("Error: 'action' not specified in config")
            sys.exit(1)
        
        # Get online_mode from config, default to True if not specified
        online_mode = config.get('online_mode', True)
        logger.info(f"Running in {'online' if online_mode else 'offline'} mode")
            
        if config['action'] == 'generate':
            logger.info("Starting filename generation")
            result = generate_filenames(config['files'], online_mode)
        elif config['action'] == 'rename':
            logger.info("Starting file renaming")
            result = rename_files(config['files'], config['new_names'])
        else:
            logger.error(f"Error: Unknown action '{config['action']}'")
            sys.exit(1)
            
        logger.info(f"Operation completed. Result: {json.dumps(result, indent=2)}")
        print(json.dumps(result))  # Ensure result is printed to stdout
        
    except Exception as e:
        logger.error(f"Error in main execution: {str(e)}", exc_info=True)
        sys.exit(1) 