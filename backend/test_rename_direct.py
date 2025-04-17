#!/usr/bin/env python3
"""
Direct test script for the file renaming features without using packaged executable
"""
import os
import json
import time

# Import the rename_files module directly
from rename_files import generate_filenames, rename_files

def run_test(config, description):
    """Run a test with the given configuration"""
    print(f"\n=== Testing: {description} ===")
    
    try:
        start_time = time.time()
        
        action = config.get('action')
        online_mode = config.get('online_mode', False)
        
        if action == 'generate':
            files = config.get('files', [])
            print(f"Generating names for {len(files)} files in {'online' if online_mode else 'offline'} mode")
            result = generate_filenames(files, online_mode)
        elif action == 'rename':
            files = config.get('files', [])
            new_names = config.get('new_names', {})
            print(f"Renaming {len(files)} files with {len(new_names)} new names")
            result = rename_files(files, new_names)
        else:
            print(f"Unknown action: {action}")
            return False
        
        end_time = time.time()
        print(f"Test completed in {end_time - start_time:.2f} seconds")
        
        if result.get('success', False):
            print("✅ Success!")
            
            print("\nResponse Summary:")
            print(f"- Success: {result.get('success', False)}")
            
            if result.get('generated_names'):
                print(f"- Generated Names: {json.dumps(result['generated_names'], indent=2)}")
            
            if result.get('renamed_files'):
                print(f"- Renamed Files: {json.dumps(result['renamed_files'], indent=2)}")
            
            return True
        else:
            print(f"❌ Failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Error running the test: {str(e)}")
        return False

def main():
    print("=== Fylr Backend File Renaming Direct Test Suite ===")
    
    # Define test configs
    generate_config = {
        "action": "generate",
        "files": [
            {"name": "img001.jpg", "type": "file", "path": "test_files/img001.jpg"},
            {"name": "document.pdf", "type": "file", "path": "test_files/document.pdf"},
            {"name": "report_2023.docx", "type": "file", "path": "test_files/report_2023.docx"}
        ],
        "online_mode": False
    }
    
    rename_config = {
        "action": "rename",
        "files": [
            {"name": "img001.jpg", "type": "file", "path": "test_files/img001.jpg"},
            {"name": "document.pdf", "type": "file", "path": "test_files/document.pdf"},
            {"name": "report_2023.docx", "type": "file", "path": "test_files/report_2023.docx"}
        ],
        "new_names": {
            "img001.jpg": "summer_vacation.jpg",
            "document.pdf": "financial_report.pdf",
            "report_2023.docx": "annual_summary.docx"
        },
        "online_mode": False
    }
    
    # Create test files directory and dummy files
    os.makedirs("test_files", exist_ok=True)
    
    # Create dummy files if they don't exist
    for file_info in generate_config["files"]:
        file_path = file_info["path"]
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                f.write(f"This is a dummy {file_info['name']} file for testing purposes.")
                
    # Run the tests
    tests = [
        (generate_config, "Generating descriptive filenames"),
        (rename_config, "Renaming files with specified names")
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