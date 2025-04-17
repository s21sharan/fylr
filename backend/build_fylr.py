#!/usr/bin/env python3
"""
Build script for Fylr backend using PyInstaller
"""
import os
import subprocess
import sys

def main():
    # Check if PyInstaller is installed
    try:
        import PyInstaller
        print("PyInstaller is installed.")
    except ImportError:
        print("PyInstaller is not installed. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("PyInstaller installed successfully.")

    # Create a .spec file for more control over the build process
    print("Creating spec file...")
    spec_file = "fylr_backend.spec"
    
    with open(spec_file, "w") as f:
        f.write("""# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['chat_agent_runner.py'],
    pathex=[],
    binaries=[],
    datas=[('.env', '.'), ('*.json', '.')],
    hiddenimports=['openai', 'langchain', 'dotenv'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='fylr_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
""")

    # Build the executable
    print("Building the executable...")
    subprocess.check_call([sys.executable, "-m", "PyInstaller", spec_file])
    
    print("\nBuild completed! The executable is in the 'dist' folder.")
    print("To run the application: ./dist/fylr_backend [config_file.json]")

if __name__ == "__main__":
    main() 