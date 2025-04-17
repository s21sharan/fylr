#!/usr/bin/env python3
"""
Test script for the packaged Fylr backend application
"""
import os
import subprocess
import json
import time

def find_executable():
    """Find the packaged executable, checking both one-file and one-folder options"""
    # Check for one-file executable (which is what we have now)
    onefile_path = os.path.join("dist", "fylr_backend")
    if os.path.exists(onefile_path):
        print(f"Found one-file executable: {onefile_path}")
        return onefile_path
    
    # Check for one-folder executable (which was what we originally expected)
    folder_path = os.path.join("dist", "fylr_backend", "fylr_backend")
    if os.path.exists(folder_path):
        print(f"Found one-folder executable: {folder_path}")
        return folder_path
    
    print("No executable found!")
    return None

def main():
    print("=== Testing Packaged Fylr Backend Application ===")
    
    # Find the executable
    executable_path = find_executable()
    if not executable_path:
        print("ERROR: Could not find packaged executable")
        return
    
    # Make sure it's executable
    os.chmod(executable_path, 0o755)
    
    # Create test config file
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
    
    # Run the application with the test config
    print("\n=== Running packaged application ===")
    command = f"./{executable_path} {test_config_path}"
    print(f"Executing: {command}")
    
    try:
        start_time = time.time()
        
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True
        )
        
        end_time = time.time()
        
        print(f"\n=== Test completed in {end_time - start_time:.2f} seconds ===")
        
        if result.returncode == 0:
            print("Exit code: 0 (Success)")
            
            # Parse JSON output if available
            try:
                output_lines = result.stdout.strip().split('\n')
                for line in output_lines:
                    if line.startswith('{') and line.endswith('}'):
                        response = json.loads(line)
                        print("\nReceived JSON response:")
                        print(json.dumps(response, indent=2))
                        break
            except json.JSONDecodeError:
                print("Could not parse JSON response")
                
            print("\nStandard output:")
            print(result.stdout)
        else:
            print(f"Exit code: {result.returncode} (Error)")
            print("\nStandard output:")
            print(result.stdout)
            print("\nStandard error:")
            print(result.stderr)
            
    except Exception as e:
        print(f"Error running the application: {str(e)}")

if __name__ == "__main__":
    main() 