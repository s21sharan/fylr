#!/usr/bin/env python3
"""
Wrapper script for chat_agent_runner.py with improved path handling and error management
for the packaged application
"""
import os
import sys
import json
import traceback
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('fylr_backend')

def get_base_dir():
    """Get the base directory of the application (works both in bundled and script mode)"""
    if getattr(sys, 'frozen', False):
        # Running as bundled app
        base_dir = sys._MEIPASS
        logger.debug(f"Running in frozen mode. Base directory: {base_dir}")
    else:
        # Running as script
        base_dir = os.path.dirname(os.path.abspath(__file__))
        logger.debug(f"Running in script mode. Base directory: {base_dir}")
    return base_dir

def main():
    """Main entry point with error handling"""
    try:
        # Print startup information
        logger.info("Starting Fylr Backend")
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Executable path: {sys.executable}")
        
        # Check for correct command line arguments
        if len(sys.argv) < 2:
            logger.error("Error: Missing configuration file argument")
            print("Usage: fylr_backend <config_file.json>")
            return 1
        
        # Get the config file path
        config_file = sys.argv[1]
        logger.info(f"Config file: {config_file}")
        
        # Ensure config file exists
        if not os.path.exists(config_file):
            logger.error(f"Error: Config file not found: {config_file}")
            return 1
        
        # Set up paths
        base_dir = get_base_dir()
        os.chdir(base_dir)
        
        # Make sure .env is available and loaded
        from dotenv import load_dotenv
        env_path = os.path.join(base_dir, '.env')
        if os.path.exists(env_path):
            load_dotenv(env_path)
            logger.info(f"Loaded environment from {env_path}")
        else:
            logger.warning(f"No .env file found at {env_path}")
            # Try to load from current directory as fallback
            load_dotenv()
        
        # Read the input config file
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            # Check for action type to determine which module to use
            action = config.get('action', 'organize')  # Default to organize if not specified
            online_mode = config.get('online_mode', False)
            
            logger.info(f"Action: {action}, Mode: {'ONLINE' if online_mode else 'OFFLINE'}")
            
            if action == 'organize':
                # File organization logic
                try:
                    from chat_agent import FileOrganizationAgent
                    logger.info("Successfully imported FileOrganizationAgent")
                except ImportError as e:
                    logger.error(f"Failed to import FileOrganizationAgent: {str(e)}")
                    logger.error(traceback.format_exc())
                    return 1
                
                # Get required fields for file organization
                message = config.get('message')
                file_structure = config.get('currentFileStructure')
                
                if not message:
                    logger.error("Missing 'message' field in config")
                    return 1
                if not file_structure:
                    logger.error("Missing 'currentFileStructure' field in config")
                    return 1
                
                # Create agent with the correct mode
                agent = FileOrganizationAgent(client=None, online_mode=online_mode)
                result = agent.process_query(message, file_structure)
                
            elif action == 'generate' or action == 'rename':
                # File renaming logic
                try:
                    if action == 'generate':
                        from rename_files import generate_filenames
                        logger.info("Successfully imported generate_filenames function")
                        
                        # Get required fields for filename generation
                        files = config.get('files')
                        if not files:
                            logger.error("Missing 'files' field in config")
                            return 1
                        
                        result = generate_filenames(files, online_mode)
                    else:  # action == 'rename'
                        from rename_files import rename_files
                        logger.info("Successfully imported rename_files function")
                        
                        # Get required fields for file renaming
                        files = config.get('files')
                        new_names = config.get('new_names')
                        
                        if not files:
                            logger.error("Missing 'files' field in config")
                            return 1
                        if not new_names:
                            logger.error("Missing 'new_names' field in config")
                            return 1
                        
                        result = rename_files(files, new_names)
                except ImportError as e:
                    logger.error(f"Failed to import renaming functions: {str(e)}")
                    logger.error(traceback.format_exc())
                    return 1
            else:
                logger.error(f"Unknown action: {action}")
                return 1
            
            # Output result in one JSON line
            print(json.dumps(result))
            return 0
            
        except Exception as e:
            logger.error(f"Error processing config file: {str(e)}")
            logger.error(traceback.format_exc())
            return 1
            
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(traceback.format_exc())
        return 1

if __name__ == '__main__':
    sys.exit(main()) 