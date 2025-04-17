#!/usr/bin/env python3
"""
Improved build script for packaging the Fylr backend with PyInstaller
"""
import os
import subprocess
import sys
import shutil
import time
import platform

def run_command(command, description):
    """Run a command and display its output in real-time"""
    print(f"\n=== {description} ===")
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
            return False
        
        return True
    except Exception as e:
        print(f"ERROR: {description} failed with exception: {str(e)}")
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
            
        spec_files = [f for f in os.listdir(".") if f.endswith(".spec")]
        for spec_file in spec_files:
            os.remove(spec_file)
            print(f"Removed {spec_file}")
            
        return True
    except Exception as e:
        print(f"WARNING: Could not clean all files: {str(e)}")
        return False

def main():
    # Get the operating system
    os_name = platform.system()
    print(f"Operating System: {os_name}")
    
    # Clean previous build files
    clean_previous_build()
    
    # Install required packages
    print("\n=== Installing required packages ===")
    packages = [
        "pyinstaller>=6.0.0",
        "openai>=1.0.0",
        "langchain>=0.0.267",
        "python-dotenv>=1.0.0"
    ]
    
    for package in packages:
        if not run_command(f"{sys.executable} -m pip install {package}", f"Installing {package}"):
            print(f"ERROR: Failed to install {package}. Exiting.")
            return
    
    # Create a one-folder build first (easier for debugging)
    print("\n=== Creating one-folder build ===")
    cmd = f"{sys.executable} -m PyInstaller chat_agent_runner.py" \
          f" --name fylr_backend" \
          f" --add-data '.env:.' --add-data '*.json:.'" \
          f" --hidden-import openai" \
          f" --hidden-import langchain" \
          f" --hidden-import langchain.agents" \
          f" --hidden-import langchain.memory" \
          f" --hidden-import langchain.prompts" \
          f" --hidden-import langchain.chains" \
          f" --hidden-import langchain.llms" \
          f" --hidden-import langchain.chat_models" \
          f" --hidden-import python-dotenv" \
          f" --hidden-import dotenv" \
          f" --hidden-import ollama"
    
    # Modify command for different platforms
    if os_name == "Windows":
        cmd = cmd.replace(":", ";")  # Windows uses ; as separator
    
    if not run_command(cmd, "Building one-folder executable"):
        print("ERROR: Failed to build one-folder executable. Exiting.")
        return
    
    print("\n=== Creating one-file build ===")
    cmd_onefile = cmd + " --onefile"
    
    if not run_command(cmd_onefile, "Building one-file executable"):
        print("ERROR: Failed to build one-file executable, but one-folder version should be available.")
    
    print("\n=== Build Complete ===")
    print("The packaged application is available in the 'dist' directory:")
    print("- One-folder version: dist/fylr_backend/")
    print("- One-file version: dist/fylr_backend (or fylr_backend.exe on Windows)")
    print("\nTo run the application:")
    if os_name == "Windows":
        print("  dist\\fylr_backend\\fylr_backend.exe sample_config.json")
        print("  or")
        print("  dist\\fylr_backend.exe sample_config.json")
    else:
        print("  ./dist/fylr_backend/fylr_backend sample_config.json")
        print("  or")
        print("  ./dist/fylr_backend sample_config.json")

if __name__ == "__main__":
    main() 