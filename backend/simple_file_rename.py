#!/usr/bin/env python3
import os
import sys
import json

def simple_rename():
    """Simple script to rename a file directly without any AI or complex dependencies"""
    print("Simple File Rename Tool")
    print("----------------------")
    
    # Get file path from user
    file_path = input("Enter the full path to the file you want to rename: ").strip()
    
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        print(f"Error: File {file_path} does not exist or is not a file")
        return
    
    # Get current filename and directory
    directory = os.path.dirname(file_path)
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
    
    # Create new file path
    new_path = os.path.join(directory, new_name)
    
    # Check if destination already exists
    if os.path.exists(new_path):
        overwrite = input(f"File '{new_name}' already exists. Overwrite? (y/n): ").strip().lower()
        if overwrite != 'y':
            print("Renaming cancelled.")
            return
    
    try:
        # Perform the rename operation
        print(f"\nRenaming '{filename}' to '{new_name}'...")
        os.rename(file_path, new_path)
        
        print(f"\nSuccessfully renamed file:")
        print(f"  {filename} -> {new_name}")
        print(f"\nNew file path: {new_path}")
    except Exception as e:
        print(f"\nError renaming file: {str(e)}")

if __name__ == "__main__":
    simple_rename() 