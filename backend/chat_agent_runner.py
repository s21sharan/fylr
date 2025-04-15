# backend/chat_agent_runner.py
import json
import sys
from chat_agent import FileOrganizationAgent
from dotenv import load_dotenv
import os
import logging
from pathlib import Path

def find_dotenv():
    """Find the .env file in development or packaged app."""
    if getattr(sys, 'frozen', False):
        # The application is frozen (packaged with PyInstaller)
        application_path = os.path.dirname(sys.executable)
        # Go up one level from backend_bin to resources
        resource_path = os.path.abspath(os.path.join(application_path, os.pardir))
        dotenv_path = os.path.join(resource_path, '.env')
    else:
        # The application is not frozen (running from source)
        # Assume .env is in the project root relative to this script
        script_dir = os.path.dirname(os.path.dirname(__file__)) # Go up from backend dir
        dotenv_path = os.path.join(script_dir, '.env')
        
    print(f"[dotenv helper] Trying to load .env from: {dotenv_path}")
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
        print(f"[dotenv helper] Loaded .env from: {dotenv_path}")
    else:
        print(f"[dotenv helper] .env file not found at: {dotenv_path}")
        # Attempt default load_dotenv() as fallback (might find it elsewhere)
        load_dotenv()

def get_log_path(log_filename):
    """Get a writable log path for packaged or development mode."""
    if getattr(sys, 'frozen', False):
        # Packaged app
        log_dir = os.path.join(os.path.expanduser("~"), "Library", "Logs", "Fylr")
    else:
        # Development mode - use backend directory
        log_dir = os.path.dirname(__file__)
        
    # Ensure the log directory exists
    os.makedirs(log_dir, exist_ok=True)
    
    return os.path.join(log_dir, log_filename)

# Call the dotenv helper
find_dotenv()

# Configure logging
log_file_path = get_log_path("chat_agent.log")
print(f"[Logging setup] Log file path: {log_file_path}")

log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('chat_agent_runner')
logger.setLevel(logging.DEBUG)

# File Handler
try:
    file_handler = logging.FileHandler(log_file_path)
    file_handler.setFormatter(log_formatter)
    logger.addHandler(file_handler)
except Exception as e:
    print(f"[Logging setup] Error setting up file handler: {e}")

# Console Handler (optional, good for dev)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_formatter)
logger.addHandler(console_handler)

logger.info("Logging configured for chat_agent_runner")

def main():
    # Load environment variables
    load_dotenv()
    
    # Read the input config file (passed as the first argument)
    with open(sys.argv[1], 'r') as f:
        config = json.load(f)

    message = config['message']
    file_structure = config['currentFileStructure']
    
    # Get the online_mode from config, defaulting to False if not specified
    online_mode = config.get('online_mode', False)
    print(f"Chat agent running in {'ONLINE' if online_mode else 'OFFLINE'} mode")

    # Create agent with the correct mode
    agent = FileOrganizationAgent(client=None, online_mode=online_mode)
    result = agent.process_query(message, file_structure)

    # Output result in one JSON line
    print(json.dumps(result))

if __name__ == '__main__':
    main()