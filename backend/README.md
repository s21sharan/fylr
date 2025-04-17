# Fylr Backend

This is the backend component of the Fylr application, packaged using PyInstaller.

## Building the Application

To build the standalone application:

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the build script:
   ```
   python build_fylr.py
   ```

This will create a standalone executable in the `dist` folder.

## Running the Packaged Application

The packaged application can be run with:

```
./dist/fylr_backend config_file.json
```

Where `config_file.json` is a JSON configuration file that varies based on the operation you want to perform.

## Supported Operations

### 1. File Organization

For organizing files, use the following configuration structure:

```json
{
  "message": "User's query or instruction",
  "currentFileStructure": { ... file structure object ... },
  "online_mode": true/false
}
```

### 2. File Renaming

The backend supports two file renaming operations:

#### A. Generate Descriptive Filenames

```json
{
  "action": "generate",
  "files": [
    {
      "name": "original_name.ext",
      "type": "file",
      "path": "/path/to/original_name.ext"
    }
  ],
  "online_mode": true/false
}
```

This returns suggested filenames based on file content.

#### B. Rename Files

```json
{
  "action": "rename",
  "files": [
    {
      "name": "original_name.ext",
      "type": "file",
      "path": "/path/to/original_name.ext"
    }
  ],
  "new_names": {
    "original_name.ext": "new_name.ext"
  },
  "online_mode": true/false
}
```

This performs the actual file renaming operation.

## Operating Modes

- **Online Mode**: Uses OpenAI's API for processing queries (requires an API key in the .env file)
- **Offline Mode**: Uses a local Ollama model for processing queries (requires Ollama to be running locally)

## Environment Variables

Create a `.env` file with:

```
OPENAI_API_KEY=your_api_key_here
```

This file will be included in the packaged application.

## Testing

To run the tests for the packaged application:

```
python test_custom.py
```

This will test all supported features including file organization and file renaming. 