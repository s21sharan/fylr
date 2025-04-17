#!/usr/bin/env python3
"""
Rebuild and test the Fylr backend application
"""
import os
import subprocess
import sys
import shutil
import time
import json

def run_command(command, description, fail_on_error=True):
    """Run a command and display its output in real-time"""
    print(f"\n=== {description} ===")
    print(f"Command: {command}")
    
    try:
        process = subprocess.Popen(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            shell=True
        )
        
        for line in process.stdout:
            print(line, end='')
        
        process.wait()
        
        if process.returncode != 0:
            print(f"ERROR: {description} failed with return code {process.returncode}")
            if fail_on_error:
                sys.exit(1)
            return False
        
        return True
    except Exception as e:
        print(f"ERROR: {description} failed with exception: {str(e)}")
        if fail_on_error:
            sys.exit(1)
        return False

def clean_previous_build():
    """Clean previous build files and directories"""
    print("\n=== Cleaning previous build files ===")
    try:
        if os.path.exists("dist"):
            shutil.rmtree("dist")
            print("Removed dist directory")
        
        if os.path.exists("build"):
            shutil.rmtree("build")
            print("Removed build directory")
            
        return True
    except Exception as e:
        print(f"WARNING: Could not clean all files: {str(e)}")
        return False

def install_dependencies():
    """Install all required dependencies"""
    dependencies = [
        "pyinstaller>=6.0.0",
        "openai>=1.0.0",
        "langchain>=0.0.267",
        "python-dotenv>=1.0.0",
        "pydantic",
        "packaging",
        "typing_extensions"
    ]
    
    for dep in dependencies:
        run_command(f"{sys.executable} -m pip install {dep}", f"Installing {dep}")

def build_application():
    """Build the application using the spec file"""
    # Build using the spec file
    run_command(f"{sys.executable} -m PyInstaller fylr_backend.spec", "Building application")

def test_application():
    """Test the built application"""
    # Create test configuration
    test_config = {
        "message": "Create a folder called 'test_docs' and move all PDF files into it",
        "currentFileStructure": {
            "files": [
                {
                    "name": "report.pdf",
                    "type": "file",
                    "path": "/Users/test/files/report.pdf"
                },
                {
                    "name": "notes.txt",
                    "type": "file",
                    "path": "/Users/test/files/notes.txt"
                },
                {
                    "name": "data.pdf",
                    "type": "file",
                    "path": "/Users/test/files/data.pdf"
                }
            ],
            "directories": []
        },
        "online_mode": False
    }
    
    test_config_path = "test_run_config.json"
    with open(test_config_path, "w") as f:
        json.dump(test_config, f, indent=2)
    
    print(f"Created test configuration: {test_config_path}")
    
    # Check if executable exists
    executable_path = os.path.join("dist", "fylr_backend", "fylr_backend")
    if not os.path.exists(executable_path):
        print(f"ERROR: Executable not found at {executable_path}")
        return False
    
    # Make executable
    os.chmod(executable_path, 0o755)
    
    # Run the application with the test config
    print("\n=== Testing the application ===")
    cmd = f"./{executable_path} {test_config_path}"
    
    return run_command(cmd, "Running application test", fail_on_error=False)

def main():
    """Main function"""
    print("=== Fylr Backend Rebuild and Test ===")
    
    # Clean previous build
    clean_previous_build()
    
    # Install dependencies
    install_dependencies()
    
    # Build the application
    build_application()
    
    # Test the application
    if test_application():
        print("\n=== Success! The application built and ran correctly ===")
    else:
        print("\n=== The application built but encountered errors when running ===")
        print("Check the error messages above for more information.")
        print("\nTry running: cd backend && ./dist/fylr_backend/fylr_backend test_run_config.json")
        print("to get more detailed error output.")

if __name__ == "__main__":
    main() 