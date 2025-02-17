import os
from pathlib import Path
import PyPDF2
from ollama import Client
from transformers import pipeline
from PIL import Image
import mimetypes
import hashlib

def setup_classifiers():
    """Initialize and return the classification pipelines"""
    text_classifier = pipeline(
        "text-classification",
        model="facebook/bart-large-mnli",
        use_fast=True  # Add this to use fast image processor
    )

    image_classifier = pipeline(
        "image-classification",
        model="google/vit-base-patch16-224",
        use_fast=True  # Add this to use fast image processor
    )
    
    return text_classifier, image_classifier

def is_image_file(file_path):
    """Check if a file is an image based on its mimetype"""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type and mime_type.startswith('image/')

def classify_image(file_path, image_classifier):
    """Classify the contents of an image file"""
    try:
        image = Image.open(file_path)
        predictions = image_classifier(image)
        # Get top prediction
        top_prediction = predictions[0]
        return f"Image containing {top_prediction['label'].lower()}"
    except Exception as e:
        print(f"Error classifying image {file_path}: {str(e)}")
        return None

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

def normalize_category(category, client):
    """Normalize categories to ensure consistent grouping using AI"""
    
    # First, remove any quotes and extra spaces
    category = category.replace("'", "").replace('"', "").strip()
    
    normalization_prompt = f"""Given this specific category name: {category}
Determine the most appropriate general category based on the actual content type.
Return a single normalized category name that groups similar content together.

Rules:
- Use lowercase with underscores for spaces
- NO quotes in the response
- Group by actual content purpose/type:
  * Travel-related content (itineraries, guides, trip plans) → travel
  * Cooking/food related (recipes, cookbooks, meal plans) → cooking
  * Pet/animal related content → pets
  * Exercise/sports/outdoor activities → fitness
  * Educational content (tutorials, courses) → education
  * Work documents (reports, presentations) → work
  * Personal documents (IDs, certificates) → personal
  * Entertainment (music, videos, games) → entertainment

Examples:
- 'climbing_guide' → fitness
- 'japan_travel_guide' → travel
- 'trip_itinerary' → travel
- 'cat_photo' → pets
- 'thai_recipe' → cooking
- 'workout_plan' → fitness
- 'lecture_notes' → education

Response (just the category name without quotes):"""

    response = client.chat(
        model='mistral',
        messages=[{'role': 'user', 'content': normalization_prompt}]
    )
    
    # Clean up the response to ensure no quotes
    normalized = response['message']['content'].strip().lower().replace("'", "").replace('"', "")
    return normalized

def suggest_content_based_categories(client, summaries):
    """Generate content-based categories based on file summaries"""
    categories_prompt = f"""Based on these file summaries, suggest 2-4 broad content-based categories.
    Categories should focus on the actual content purpose/type.
    Group similar content together based on its use/purpose.
    Use lowercase with underscores for spaces.
    DO NOT include any quotes in category names.
    
    Common category examples:
    - travel for all travel-related content (guides, itineraries, trip plans)
    - pets for animal-related content
    - cooking for food-related content
    - fitness for exercise/sports content
    - education for learning materials
    - work for professional documents
    - personal for personal documents
    
    File Summaries:
    {summaries}
    
    Respond with just the category names in lowercase, one per line, no quotes:"""
    
    response = client.chat(
        model='mistral',
        messages=[{'role': 'user', 'content': categories_prompt}]
    )
    
    # Clean up categories to ensure no quotes
    categories = [cat.strip().replace("'", "").replace('"', "") 
                 for cat in response['message']['content'].strip().split('\n')]
    return categories

def get_file_summary(file_path, client, image_classifier):
    """Get summary for a single file"""
    try:
        if is_image_file(file_path):
            return classify_image(file_path, image_classifier)
        else:
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
            
            if text:
                summary_response = client.chat(
                    model='mistral',
                    messages=[{
                        'role': 'user',
                        'content': f"Summarize the main topic and type of content in one short sentence: {text[:2000]}"
                    }]
                )
                return summary_response['message']['content'].strip()
            else:
                print("No text extracted from file.")
                return None
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return None

def get_file_hash(file_path):
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read the file in chunks to handle large files efficiently
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def list_and_summarize_files():
    # Ask user for directory path
    directory = input("Please enter the directory path: ").strip()
    
    # Check if directory exists
    if not os.path.isdir(directory):
        print("Error: Directory does not exist!")
        return
    
    # Initialize classifiers
    text_classifier, image_classifier = setup_classifiers()
    
    # Initialize Ollama client
    client = Client(host="http://localhost:11434")
    
    # Initialize lists for files and their summaries
    files_to_process = []
    file_summaries = {}
    
    # Walk through directory
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            if file.lower().endswith(('.pdf', '.txt')) or is_image_file(file_path):
                files_to_process.append(file_path)
    
    # Check for duplicates
    print("\nChecking for duplicate files...")
    file_hashes = {}
    duplicates = {}
    
    for file_path in files_to_process:
        file_hash = get_file_hash(file_path)
        if file_hash in file_hashes:
            if file_hash not in duplicates:
                duplicates[file_hash] = [file_hashes[file_hash]]
            duplicates[file_hash].append(file_path)
        else:
            file_hashes[file_hash] = file_path
    
    # Handle duplicates if found
    if duplicates:
        print("\nDuplicate files found:")
        for file_hash, duplicate_files in duplicates.items():
            print("\nDuplicate set:")
            for i, file_path in enumerate(duplicate_files, 1):
                print(f"{i}. {file_path}")
        
        response = input("\nWould you like to remove duplicate files? (y/n): ").lower()
        if response == 'y':
            for file_hash, duplicate_files in duplicates.items():
                print(f"\nDuplicate set:")
                for i, file_path in enumerate(duplicate_files, 1):
                    print(f"{i}. {file_path}")
                keep_index = int(input("Enter the number of the file to keep (others will be removed): ")) - 1
                
                # Remove all files except the one to keep
                for i, file_path in enumerate(duplicate_files):
                    if i != keep_index:
                        try:
                            os.remove(file_path)
                            print(f"Removed: {file_path}")
                            # Remove from files_to_process
                            files_to_process.remove(file_path)
                        except Exception as e:
                            print(f"Error removing {file_path}: {str(e)}")
    
    # First pass: Get summaries of all files
    print("\nGathering file summaries:")
    for file_path in files_to_process:
        print(f"\nAnalyzing: {file_path}")
        summary = get_file_summary(file_path, client, image_classifier)
        if summary:
            file_summaries[file_path] = summary
    
    if file_summaries:
        # Generate content-based categories
        print("\nGenerating categories...")
        summaries_context = "\n".join([f"File: {os.path.basename(path)}\nSummary: {summary}" 
                                     for path, summary in file_summaries.items()])
        
        # Get content-based categories
        categories = suggest_content_based_categories(client, summaries_context)
        
        # Categorize files
        file_categories = {}
        for file_path, summary in file_summaries.items():
            categorize_prompt = f"""Given these specific content categories:
{', '.join(categories)}

Assign this file to exactly ONE of those categories (respond with just the category name).
Choose the most general, appropriate category that fits this content.

File summary: {summary}

Response (just the category name):"""
            
            categorize_response = client.chat(
                model='mistral',
                messages=[{'role': 'user', 'content': categorize_prompt}]
            )
            category = categorize_response['message']['content'].strip().lower()
            category = normalize_category(category, client)
            file_categories[file_path] = category
                
        # Generate new file names
        new_file_names = {}
        print("\nGenerating descriptive file names...")
        for file_path in files_to_process:
            try:
                if is_image_file(file_path):
                    classification = classify_image(file_path, image_classifier)
                    if classification:
                        new_name = classification.replace("Image containing ", "").replace(" ", "_")
                        ext = os.path.splitext(file_path)[1]
                        new_file_names[file_path] = f"{new_name}{ext}"
                    else:
                        new_file_names[file_path] = os.path.basename(file_path)
                else:
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
        print("No files were successfully processed")

if __name__ == "__main__":
    list_and_summarize_files()