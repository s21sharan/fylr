import os
from pathlib import Path
import PyPDF2
from ollama import Client  # Ensure ollama is installed

def generate_file_name(client, file_content, max_length=50):
    """Generate a descriptive file name based on content"""
    name_prompt = f"""Generate a very short, descriptive filename (without extension) for a document with this content. 
    Use lowercase, underscores for spaces, max {max_length} chars, no special characters:
    {file_content[:2000]}
    
    Respond with just the filename, nothing else."""
    
    response = client.chat(
        model='mistral',
        messages=[{'role': 'user', 'content': name_prompt}]
    )
    
    return response['message']['content'].strip()

def list_and_summarize_files():
    # Ask user for directory path
    directory = input("Please enter the directory path: ").strip()
    
    # Check if directory exists
    if not os.path.isdir(directory):
        print("Error: Directory does not exist!")
        return
    
    # Initialize Ollama client
    client = Client(host="http://localhost:11434")  # Ensure Ollama server is running
    
    # Initialize list for files and their summaries
    files_to_process = []
    file_summaries = {}
    
    # Walk through directory
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.pdf', '.txt')):
                files_to_process.append(os.path.join(root, file))
    
    # First pass: Get summaries of all files
    print("\nGathering file summaries:")
    if files_to_process:
        for file_path in files_to_process:
            print(f"\nAnalyzing: {file_path}")
            try:
                text = ""
                if file_path.lower().endswith('.pdf'):
                    with open(file_path, 'rb') as file:
                        reader = PyPDF2.PdfReader(file)
                        for page in reader.pages:
                            page_text = page.extract_text()
                            if page_text:
                                text += page_text
                else:  # .txt file
                    with open(file_path, 'r', encoding='utf-8') as file:
                        text = file.read()
                
                # Get summary of file content
                if text:
                    summary_response = client.chat(
                        model='mistral',
                        messages=[{
                            'role': 'user',
                            'content': f"Summarize this content in one short sentence: {text[:2000]}"
                        }]
                    )
                    summary = summary_response['message']['content'].strip()
                    file_summaries[file_path] = summary
                else:
                    print("No text extracted from file.")
            except Exception as e:
                print(f"Error processing {file_path}: {str(e)}")
        
        # Second pass: Generate categories based on all summaries
        print("\nGenerating categories...")
        summaries_context = "\n".join([f"File: {os.path.basename(path)}\nSummary: {summary}" 
                                     for path, summary in file_summaries.items()])
        
        categories_response = client.chat(
            model='mistral',
            messages=[{
                'role': 'user',
                'content': f"""Based on these file summaries, suggest 2-4 broad, general categories that would organize these files logically.
                Use only common, high-level organizationalcategories like these examples:
                - Financial
                - Food_and_Recipes
                - Meetings_and_Notes
                - Personal
                - Photos
                - Travel
                - Work
                - Projects
                
                Do not use specific topic categories (like 'ocean_studies' or 'animal_research'). It should be names for folders, not topics.

{summaries_context}

Respond in this exact format (categories only, lowercase):
category1
category2
category3"""
            }]
        )
        
        # Get categories
        categories = [cat.strip() for cat in categories_response['message']['content'].strip().split('\n')]
        
        # Third pass: Categorize each file
        file_categories = {}
        for file_path, summary in file_summaries.items():
            categorize_response = client.chat(
                model='mistral',
                messages=[{
                    'role': 'user',
                    'content': f"""Given these categories:
{', '.join(categories)}

Assign this file to exactly ONE of those categories (respond with just the category name):
File summary: {summary}"""
                }]
            )
            category = categorize_response['message']['content'].strip().lower()
            file_categories[file_path] = category
                
        # Generate new file names
        new_file_names = {}
        print("\nGenerating descriptive file names...")
        for file_path in files_to_process:
            try:
                text = ""
                if file_path.lower().endswith('.pdf'):
                    with open(file_path, 'rb') as file:
                        reader = PyPDF2.PdfReader(file)
                        for page in reader.pages:
                            text += page.extract_text()
                else:  # .txt file
                    with open(file_path, 'r', encoding='utf-8') as file:
                        text = file.read()
                
                new_name = generate_file_name(client, text)
                ext = os.path.splitext(file_path)[1]
                new_file_names[file_path] = f"{new_name}{ext}"
            except Exception as e:
                print(f"Error generating name for {file_path}: {str(e)}")
                new_file_names[file_path] = os.path.basename(file_path)

        # Show proposed file structure
        print("\nProposed File Structure:")
        print(f"{directory}/")
        
        # Group files by category
        categorized_files = {}
        for file_path, category in file_categories.items():
            if category not in categorized_files:
                categorized_files[category] = []
            categorized_files[category].append((file_path, new_file_names[file_path]))
        
        # Print proposed structure
        for category, files in sorted(categorized_files.items()):
            print(f"└── {category}/")
            for _, new_name in sorted(files):
                print(f"    └── {new_name}")
        
        # Ask if user wants to apply changes
        response = input("\nWould you like to apply these changes? (y/n): ").lower()
        if response == 'y':
            for file_path, category in file_categories.items():
                proposed_path = os.path.join(directory, category)
                os.makedirs(proposed_path, exist_ok=True)
                new_name = new_file_names[file_path]
                new_file_path = os.path.join(proposed_path, new_name)
                os.rename(file_path, new_file_path)
            print("Files have been reorganized and renamed according to the proposed structure.")
    else:
        print("No PDF or TXT files found")

if __name__ == "__main__":
    list_and_summarize_files()