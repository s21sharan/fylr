# Troubleshooting Guide for Packaged Fylr Backend

If you encounter issues with the packaged backend application, follow these troubleshooting steps:

## Common Issues and Solutions

### 1. Missing Module Errors

If you see errors like `ModuleNotFoundError: No module named 'pydantic.deprecated.decorator'`, this indicates that PyInstaller didn't include all required dependencies.

**Solution:**
- Edit the `fylr_backend.spec` file to add the missing module to the `hiddenimports` list
- Rebuild the application with: `python rebuild_and_test.py`

### 2. Dependency Analysis

Run the dependency analysis script to identify all required modules:

```
python collect_imports.py chat_agent_runner.py
```

This will generate a JSON file with all imports and print a suggested `hiddenimports` list.

### 3. Path-related Issues

If the application can't find data files (like `.env` or JSON config files):

**Solution:**
- Make sure all data files are properly included in the `datas` list in the spec file
- For relative paths, use:
  ```python
  import os
  import sys
  
  # Get the application's base directory
  if getattr(sys, 'frozen', False):
      # Running as bundled app
      base_dir = sys._MEIPASS
  else:
      # Running as script
      base_dir = os.path.dirname(os.path.abspath(__file__))
  
  # Use this path to locate your files
  config_path = os.path.join(base_dir, 'config.json')
  ```

### 4. Environment Variable Issues

If the application can't access environment variables:

**Solution:**
- Ensure `.env` file is included in the package with:
  ```
  datas=[('.env', '.'), ('*.json', '.')],
  ```
- Verify that your code is properly loading the `.env` file from the correct location

### 5. Debug Mode

To get more detailed error information, enable debug mode in the spec file:

```python
exe = EXE(
    # other parameters...
    debug=True,
    # other parameters...
)
```

### 6. Running with Console Output (Windows)

If you're using Windows and the application has a GUI, make sure to run it with console output during testing to see error messages:

```
exe = EXE(
    # other parameters...
    console=True,
    # other parameters...
)
```

### 7. Ollama or OpenAI API Issues

If the application fails when connecting to Ollama or OpenAI:

**Solution:**
- Ensure the API keys or connection details are properly configured
- Add fallback mechanisms to handle connection errors gracefully

## Additional Resources

- [PyInstaller Documentation](https://pyinstaller.org/en/stable/)
- [PyInstaller Debugging Guide](https://pyinstaller.org/en/stable/when-things-go-wrong.html)
- [Common PyInstaller Issues](https://pyinstaller.org/en/stable/common-issues-and-pitfalls.html)

## Getting Help

If you continue to experience issues:
1. Run the application with full debug output
2. Capture the complete error message 
3. Check the application logs
4. Contact the development team with detailed information about the issue 