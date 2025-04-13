import os
import sys
import json
from pathlib import Path
import PyPDF2
from ollama import Client
from PIL import Image
import mimetypes
import hashlib
import csv
import time
import moondream as md

FILE_PROMPT = """
You are an AI assistant tasked with organizing files based on their summaries. You will be provided with a list of source files and a summary of their contents. Your goal is to organize these files by adding ONE category subfolder to their existing path structure.

Rules for organizing:
1. The dst_path MUST preserve the original file path
2. Add ONLY ONE new subfolder under the original path to categorize the file
3. Use consistent naming conventions with underscores
4. Categories should be simple like: Academic, Research, Images, Documents, etc.
5. Do not create deep nested folders

Please return your response as a JSON object matching the following schema:

```json
{
  "files": [
    {
      "src_path": "original file path",
      "dst_path": "original_path/category/filename"
    }
  ]
}
```

For example, if a file is at "/Users/john/Documents/paper.pdf", and it's an academic paper,
the dst_path should be "/Users/john/Documents/Academic/paper.pdf"

IMPORTANT: 
- The dst_path must preserve the original path structure
- Add only ONE new subfolder for categorization
- Do not create multiple nested category folders
""".strip()

def is_image_file(file_path):
    """Check if a file is an image based on its mimetype"""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type and mime_type.startswith('image/')

def classify_image(file_path, client):
    """Classify the contents of an image file using Moondream model"""
    try:
        # Initialize Moondream model
        model = md.vl(model="/Users/sharans/Downloads/moondream-0_5b-int8.mf")
        
        # Load and process image
        image = Image.open(file_path)
        caption = model.caption(image)["caption"]
        
        if caption:
            # Use the caption with local LLM to generate a more structured summary
            prompt = f"""Based on this image caption: "{caption}"
Generate a concise summary suitable for file organization. Focus on the main subject and context.
Return ONLY the summary text, no additional formatting or explanations."""
            
            response = client.chat(
                model='mistral',
                messages=[{'role': 'user', 'content': prompt}],
                options={"temperature": 0, "num_predict": 100}
            )
            
            summary = response['message']['content'].strip()
            return f"Image containing {summary.lower()}"
        else:
            return f"Image file from {os.path.basename(file_path)}"
    except Exception as e:
        print(f"Error analyzing image with Moondream: {str(e)}")
        return f"Image file from {os.path.basename(file_path)}"

def generate_file_name(client, summary, max_length=30):
    """Generate a very concise file name based on the file summary"""
    prompt = {
        "task": "filename_generation",
        "instruction": "You are given the summary of the contents of a file. Generate an extremely concise filename (2-4 words maximum) with underscores between words. Use general naming conventions. Do not include the file extension.",
        "parameters": {
            "max_length": max_length,
            "format": "lowercase_with_underscores",
            "max_words": 3,
            "special_characters": "none",
            "word_separator": "_"
        },
        "summary": summary
    }
    
    response = client.chat(
        model='mistral',
        messages=[{'role': 'user', 'content': json.dumps(prompt)}]
    )
    
    filename = response['message']['content'].strip()
    words = [word.strip().lower() for word in filename.split() if word.strip()]
    filename = '_'.join(words)
    filename = ''.join(c for c in filename if c.isalnum() or c == '_')
    
    if '_' not in filename and len(filename) > 3:
        new_filename = ''
        for i, char in enumerate(filename):
            if i > 0 and char.isupper():
                new_filename += '_' + char.lower()
            else:
                new_filename += char.lower()
        filename = new_filename
    
    while '__' in filename:
        filename = filename.replace('__', '_')
    
    filename = filename.strip('_')
    return filename

def get_file_summary(file_path, client, image_classifier=None):
    """Get summary for a single file"""
    try:
        if is_image_file(file_path):
            # Always use Moondream for image analysis in local mode
            return classify_image(file_path, client)
        else:
            text = ""
            if file_path.lower().endswith('.pdf'):
                with open(file_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text
                            if len(text) >= 1000:
                                text = text[:1000]
                                break
            else:
                with open(file_path, 'r', encoding='utf-8') as file:
                    text = file.read(1000)
            
            if text:
                prompt = """
You will be provided with the contents of a file along with its metadata. Provide a summary of the contents. The purpose of the summary is to organize files based on their content. To this end provide a concise but informative summary. Make the summary as specific to the file as possible.

Write your response a JSON object with the following schema:

```json
{
    "file_path": "path to the file including name",
    "summary": "summary of the content"
}
```
""".strip()
                
                file_content = {
                    "file_path": file_path,
                    "content": text
                }
                
                summary_response = client.chat(
                    model='mistral',
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": json.dumps(file_content)}
                    ],
                    options={"temperature": 0, "num_predict": 256}
                )
                
                try:
                    response_content = summary_response['message']['content']
                    json_start = response_content.find('{')
                    json_end = response_content.rfind('}') + 1
                    if json_start >= 0 and json_end > json_start:
                        json_str = response_content[json_start:json_end]
                        result = json.loads(json_str)
                        return result["summary"]
                    else:
                        return response_content.strip()
                except Exception as e:
                    print(f"Error parsing JSON response: {str(e)}")
                    return response_content.strip()
            else:
                return None
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return None

def get_file_hash(file_path):
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def print_separator():
    print("\n" + "=" * 80)

def analyze_directory(directory_path):
    """Analyze the directory and return the file structure data"""
    client = Client(host="http://localhost:11434")
    files_to_process = []
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            file_path = os.path.join(root, file)
            if file.lower().endswith(('.pdf', '.txt')) or is_image_file(file_path):
                files_to_process.append(file_path)
    
    print_separator()
    print(f"Found {len(files_to_process)} files to process")
    print_separator()
    
    file_summaries = []
    
    print("GENERATING FILE SUMMARIES:")
    for file_path in files_to_process:
        print(f"\nAnalyzing: {file_path}")
        summary = get_file_summary(file_path, client)
        if summary:
            print(f"Summary: {summary}")
            file_summaries.append({
                "file_path": file_path,
                "summary": summary
            })
    
    if file_summaries:
        formatted_input = []
        for summary in file_summaries:
            formatted_input.append({
                "file_path": summary["file_path"],
                "summary": summary["summary"]
            })
        
        print_separator()
        print("SENDING TO LLM:")
        print("\nSystem Prompt:")
        print(FILE_PROMPT)
        print("\nFormatted Input:")
        print(json.dumps(formatted_input, indent=2))
        print_separator()
        
        # Add explicit JSON formatting instruction
        messages = [
            {"role": "system", "content": "You must respond with ONLY valid JSON. No other text or explanations. The JSON must follow the schema: {\"files\": [{\"src_path\": \"path\", \"dst_path\": \"original_path/category/filename\"}]}"},
            {"role": "system", "content": FILE_PROMPT},
            {"role": "user", "content": json.dumps(formatted_input)}
        ]
        
        structure_response = client.chat(
            model='mistral',
            messages=messages,
            options={"temperature": 0, "num_predict": 2048}
        )
        
        response_content = structure_response['message']['content'].strip()
        
        print_separator()
        print("RAW LLM RESPONSE:")
        print(response_content)
        print_separator()
        
        try:
            # First try to parse the entire response as JSON
            try:
                result = json.loads(response_content)
            except json.JSONDecodeError:
                # If that fails, try to extract JSON from the response
                json_start = response_content.find('{')
                json_end = response_content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response_content[json_start:json_end]
                    result = json.loads(json_str)
                else:
                    print("\nError: Response is not in JSON format. Got:")
                    print(response_content[:500] + "..." if len(response_content) > 500 else response_content)
                    return json.dumps({"files": []})
            
            print_separator()
            print("PARSED JSON RESULT:")
            print(json.dumps(result, indent=2))
            print_separator()
            
            if "files" in result and isinstance(result["files"], list):
                print(f"\nSuccessfully generated file structure with {len(result['files'])} files")
                return json.dumps(result, indent=2)
            else:
                print("\nError: Invalid structure in LLM response - missing 'files' array")
                print("Got:", json.dumps(result, indent=2))
                return json.dumps({"files": []})
        except Exception as e:
            print(f"\nError parsing response: {str(e)}")
            print("Raw response:", response_content[:500] + "..." if len(response_content) > 500 else response_content)
            return json.dumps({"files": []})
    
    print("\nNo valid file summaries found")
    return json.dumps({"files": []})

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing configuration file path")
        sys.exit(1)
        
    config_path = sys.argv[1]
    
    try:
        with open(config_path, 'r') as config_file:
            config = json.load(config_file)
            directory = config.get('directory')
            
            if not directory or not os.path.isdir(directory):
                print("Error: Invalid directory path")
                sys.exit(1)
                
            result = analyze_directory(directory)
            print(result)
            
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)