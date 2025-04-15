#!/bin/bash

# Exit on error
set -e

# Configuration
PYTHON_BACKEND_DIR="backend"
PYINSTALLER_OUTPUT_DIR="dist_pyinstaller"
PYINSTALLER_WORK_DIR="build_pyinstaller"

# Clean previous builds
echo "Cleaning previous PyInstaller builds..."
rm -rf "${PYINSTALLER_OUTPUT_DIR}"
rm -rf "${PYINSTALLER_WORK_DIR}"

# Ensure output directory exists
mkdir -p "${PYINSTALLER_OUTPUT_DIR}"

# Use system pyinstaller command (assuming it uses the intended Python env)
echo "Using pyinstaller command found in PATH"

# Entry points to bundle
ENTRY_POINTS=(
  "initial_organize_electron.py"
  "apply_changes.py"
  "chat_agent_runner.py"
  "rename_files.py"
)

# Bundle each entry point
for entry_point in "${ENTRY_POINTS[@]}"
do
  echo "Bundling ${entry_point} with PyInstaller..."
  
  # Get the base name without extension
  base_name=$(basename "${entry_point}" .py)
  
  # Run PyInstaller
  # --onefile: Create a single executable file
  # --noconsole: Prevent console window from opening on Windows (adjust if needed)
  # --name: Specify the output executable name
  # --distpath: Output directory for the executable
  # --workpath: Directory for temporary build files
  # --specpath: Directory for the .spec file (intermediate config)
  # --paths: Add the backend directory to Python's path
  pyinstaller \
    --onefile \
    --noconsole \
    --name "${base_name}" \
    --distpath "${PYINSTALLER_OUTPUT_DIR}" \
    --workpath "${PYINSTALLER_WORK_DIR}" \
    --specpath "${PYINSTALLER_WORK_DIR}" \
    --paths "${PYTHON_BACKEND_DIR}" \
    "${PYTHON_BACKEND_DIR}/${entry_point}"
  
  echo "Finished bundling ${entry_point}."
done

echo "PyInstaller bundling complete. Output in ${PYINSTALLER_OUTPUT_DIR}" 