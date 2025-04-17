#!/usr/bin/env python3
"""
Custom test script for the packaged Fylr backend application
"""
import os
import subprocess
import json
import time

def run_test(test_config_file, description):
    """Run a test with the given configuration file"""
    print(f"\n=== Testing: {description} ===")
    
    # Check if the executable exists
    executable_path = "dist/fylr_backend/fylr_backend"
    if not os.path.exists(executable_path):
        print(f"ERROR: Executable not found at {executable_path}")
        return
    
    # Make sure the config file exists
    if not os.path.exists(test_config_file):
        print(f"ERROR: Test config file not found: {test_config_file}")
        return
    
    # Make sure executable is executable
    os.chmod(executable_path, 0o755)
    
    # Run the application with the test config
    command = f"./{executable_path} {test_config_file}"
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
        
        print(f"Test completed in {end_time - start_time:.2f} seconds")
        
        if result.returncode == 0:
            print("✅ Success!")
            
            # Parse JSON output if available
            try:
                output_lines = result.stdout.strip().split('\n')
                for line in output_lines:
                    if line.startswith('{') and line.endswith('}'):
                        response = json.loads(line)
                        print("\nResponse Summary:")
                        
                        # For file organization test
                        if response.get('message'):
                            print(f"- Message: {response['message'][:50]}...")
                            if response.get('updatedFileStructure'):
                                files = response['updatedFileStructure'].get('files', [])
                                directories = response['updatedFileStructure'].get('directories', [])
                                print(f"- Files: {len(files)}")
                                print(f"- Directories: {len(directories)}")
                        
                        # For file renaming test
                        if response.get('success') is not None:
                            print(f"- Success: {response['success']}")
                            if response.get('generated_names'):
                                print(f"- Generated Names: {json.dumps(response['generated_names'], indent=2)}")
                            if response.get('renamed_files'):
                                print(f"- Renamed Files: {json.dumps(response['renamed_files'], indent=2)}")
                            if response.get('error'):
                                print(f"- Error: {response['error']}")
                        break
            except json.JSONDecodeError:
                print("❌ Could not parse JSON response")
        else:
            print(f"❌ Failed with exit code: {result.returncode}")
            print("\nError output:")
            print(result.stderr)
            
    except Exception as e:
        print(f"❌ Error running the application: {str(e)}")

def main():
    print("=== Fylr Backend Custom Test Suite ===")
    
    # Test organizing PDF files
    run_test("sample_config.json", "Organizing PDF files")
    
    # Create a test config for image files if it doesn't exist
    image_config = {
        "message": "Create a folder called 'images' and move all image files (jpg, png) into it",
        "currentFileStructure": {
            "files": [
                {"name": "vacation.jpg", "type": "file", "path": "/Users/test/vacation.jpg"},
                {"name": "document.pdf", "type": "file", "path": "/Users/test/document.pdf"},
                {"name": "logo.png", "type": "file", "path": "/Users/test/logo.png"},
                {"name": "screenshot.jpg", "type": "file", "path": "/Users/test/screenshot.jpg"},
                {"name": "notes.txt", "type": "file", "path": "/Users/test/notes.txt"}
            ],
            "directories": []
        },
        "online_mode": False
    }
    
    with open("test_images.json", "w") as f:
        json.dump(image_config, f, indent=2)
    
    # Test organizing image files
    run_test("test_images.json", "Organizing image files")
    
    # Test file renaming feature - generating names
    run_test("test_rename_files.json", "Generating descriptive filenames")
    
    # Test file renaming feature - actual rename operation
    run_test("test_rename_operation.json", "Renaming files with specified names")

if __name__ == "__main__":
    main() 