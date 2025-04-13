#!/usr/bin/env python3
import os
import json
import sys
from pathlib import Path

# Import functions from rename_files.py
from backend.rename_files import rename_files

def direct_rename():
    print("Direct File Rename Tool")
    print("----------------------")
    
    # Get file path from user
    file_path = input("Enter the full path to the file you want to rename: ").strip()
    
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        print(f"Error: File {file_path} does not exist or is not a file")
        return
    
    # Get current filename
    filename = os.path.basename(file_path)
    
    # Get desired new name
    new_name = input(f"Enter new name for '{filename}': ").strip()
    
    if not new_name:
        print("Error: New name cannot be empty")
        return
    
    # Ensure extension is preserved
    _, original_ext = os.path.splitext(filename)
    _, new_ext = os.path.splitext(new_name)
    
    if not new_ext and original_ext:
        new_name = f"{new_name}{original_ext}"
        print(f"Added original extension to new name: {new_name}")
    
    # Create file info and name mapping
    file_info = [{
        "path": file_path,
        "name": filename,
        "size": os.path.getsize(file_path)
    }]
    
    name_mapping = {filename: new_name}
    
    # Proceed with renaming
    print(f"\nRenaming '{filename}' to '{new_name}'...")
    rename_result = rename_files(file_info, name_mapping)
    
    if rename_result["success"]:
        renamed = rename_result.get("renamed_files", [])
        if renamed:
            print(f"\nSuccessfully renamed file:")
            print(f"  {renamed[0]['original']} -> {renamed[0]['new']}")
            
            # Show new file path
            directory = os.path.dirname(file_path)
            new_path = os.path.join(directory, renamed[0]['new'])
            print(f"\nNew file path: {new_path}")
        else:
            print("\nNo files were renamed (file may already have the specified name)")
    else:
        print(f"\nError renaming file: {rename_result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    direct_rename() 