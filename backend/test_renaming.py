#!/usr/bin/env python3
"""
Test script specifically for the file renaming features of the Fylr backend
"""
import os
import subprocess
import json
import time

def run_test(test_config_file, description):
    """Run a test with the given configuration file"""
    print(f"\n=== Testing: {description} ===")
    
    # Check if the executable exists (one-folder build)
    executable_path = "dist/fylr_backend/fylr_backend"
    if not os.path.exists(executable_path):
        print(f"ERROR: Executable not found at {executable_path}")
        return False
    
    # Make sure the config file exists
    if not os.path.exists(test_config_file):
        print(f"ERROR: Test config file not found: {test_config_file}")
        return False
    
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
                        print(f"- Success: {response.get('success', False)}")
                        
                        if response.get('generated_names'):
                            print(f"- Generated Names: {json.dumps(response['generated_names'], indent=2)}")
                        
                        if response.get('renamed_files'):
                            print(f"- Renamed Files: {json.dumps(response['renamed_files'], indent=2)}")
                        
                        if response.get('error'):
                            print(f"- Error: {response['error']}")
                        break
                return True
            except json.JSONDecodeError:
                print("❌ Could not parse JSON response")
                return False
        else:
            print(f"❌ Failed with exit code: {result.returncode}")
            print("\nError output:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Error running the application: {str(e)}")
        return False

def main():
    print("=== Fylr Backend File Renaming Test Suite ===")
    
    # Create test configs if they don't exist
    if not os.path.exists("test_rename_files.json"):
        generate_config = {
            "action": "generate",
            "files": [
                {"name": "img001.jpg", "type": "file", "path": "/Users/test/img001.jpg"},
                {"name": "document.pdf", "type": "file", "path": "/Users/test/document.pdf"},
                {"name": "report_2023.docx", "type": "file", "path": "/Users/test/report_2023.docx"}
            ],
            "online_mode": False
        }
        
        with open("test_rename_files.json", "w") as f:
            json.dump(generate_config, f, indent=2)
    
    if not os.path.exists("test_rename_operation.json"):
        rename_config = {
            "action": "rename",
            "files": [
                {"name": "img001.jpg", "type": "file", "path": "/Users/test/img001.jpg"},
                {"name": "document.pdf", "type": "file", "path": "/Users/test/document.pdf"},
                {"name": "report_2023.docx", "type": "file", "path": "/Users/test/report_2023.docx"}
            ],
            "new_names": {
                "img001.jpg": "summer_vacation.jpg",
                "document.pdf": "financial_report.pdf",
                "report_2023.docx": "annual_summary.docx"
            },
            "online_mode": False
        }
        
        with open("test_rename_operation.json", "w") as f:
            json.dump(rename_config, f, indent=2)
    
    # Run the tests
    tests = [
        ("test_rename_files.json", "Generating descriptive filenames"),
        ("test_rename_operation.json", "Renaming files with specified names")
    ]
    
    results = []
    for config, description in tests:
        result = run_test(config, description)
        results.append((description, result))
    
    # Summary
    print("\n=== Test Summary ===")
    all_passed = True
    for description, result in results:
        status = "PASSED" if result else "FAILED"
        print(f"- {description}: {status}")
        if not result:
            all_passed = False
    
    if all_passed:
        print("\nAll tests passed successfully!")
        return 0
    else:
        print("\nSome tests failed. See details above.")
        return 1

if __name__ == "__main__":
    exit(main()) 