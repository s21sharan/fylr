import os
import sys
import json

def apply_changes(structure_path):
    """Apply the file structure changes"""
    try:
        with open(structure_path, 'r') as f:
            structure = json.load(f)
            
        for file_info in structure.get('files', []):
            src_path = file_info.get('src_path')
            dst_path = file_info.get('dst_path')
            
            if not src_path or not dst_path:
                continue
                
            # Create destination directory if it doesn't exist
            dst_dir = os.path.dirname(dst_path)
            os.makedirs(dst_dir, exist_ok=True)
            
            # Move and rename file
            try:
                os.rename(src_path, dst_path)
                print(f"Moved: {os.path.basename(src_path)} -> {dst_path}")
            except Exception as e:
                print(f"Error moving {os.path.basename(src_path)}: {str(e)}")
                
        print("Files have been reorganized according to the proposed structure.")
        return True
    except Exception as e:
        print(f"Error applying changes: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing structure file path")
        sys.exit(1)
        
    structure_path = sys.argv[1]
    apply_changes(structure_path)