import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime, timedelta
from ollama import Client
import PyPDF2
from transformers import pipeline
from PIL import Image
import mimetypes
import hashlib
from collections import defaultdict

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, monitored_folders, client):
        self.monitored_folders = monitored_folders
        self.client = client
        self.pending_files = defaultdict(list)  # Store new files by directory
        self.last_process_time = datetime.now()
        
        # Initialize classifiers
        self.text_classifier, self.image_classifier = self.setup_classifiers()
    
    def setup_classifiers(self):
        """Initialize and return the classification pipelines"""
        text_classifier = pipeline(
            "text-classification",
            model="facebook/bart-large-mnli",
            use_fast=True
        )

        image_classifier = pipeline(
            "image-classification",
            model="google/vit-base-patch16-224",
            use_fast=True
        )
        
        return text_classifier, image_classifier

    def on_created(self, event):
        if not event.is_directory:
            file_path = event.src_path
            parent_dir = os.path.dirname(file_path)
            
            if parent_dir in self.monitored_folders:
                self.pending_files[parent_dir].append(file_path)
                print(f"New file detected: {file_path}")
    
    def process_pending_files(self):
        """Process all pending files if it's end of day or enough files have accumulated"""
        current_time = datetime.now()
        
        # Process if it's end of day (6 PM) or if 4 hours have passed since last processing
        if (current_time.hour == 18 or 
            current_time - self.last_process_time > timedelta(hours=4)) and self.pending_files:
            
            print("\nProcessing pending files...")
            for directory, files in self.pending_files.items():
                if files:
                    print(f"\nProcessing files in {directory}")
                    self.organize_files(directory, files)
            
            # Clear pending files and update last process time
            self.pending_files.clear()
            self.last_process_time = current_time

    def organize_files(self, directory, files):
        """Organize the given files using the same logic as initial_organize.py"""
        # Import functions from initial_organize.py
        from backend.initial_organize import (get_file_summary, normalize_category,
                                    suggest_content_based_categories, get_file_hash)
        
        # Check for duplicates first
        print("Checking for duplicates...")
        file_hashes = {}
        duplicates = {}
        unique_files = []
        
        for file_path in files:
            file_hash = get_file_hash(file_path)
            if file_hash in file_hashes:
                if file_hash not in duplicates:
                    duplicates[file_hash] = [file_hashes[file_hash]]
                duplicates[file_hash].append(file_path)
            else:
                file_hashes[file_hash] = file_path
                unique_files.append(file_path)
        
        # Remove duplicate files (keep the first occurrence)
        for file_hash, duplicate_files in duplicates.items():
            for file_path in duplicate_files[1:]:  # Skip the first file
                try:
                    os.remove(file_path)
                    print(f"Removed duplicate: {file_path}")
                except Exception as e:
                    print(f"Error removing duplicate {file_path}: {str(e)}")
        
        # Process unique files
        file_summaries = {}
        for file_path in unique_files:
            summary = get_file_summary(file_path, self.client, self.image_classifier)
            if summary:
                file_summaries[file_path] = summary
        
        if file_summaries:
            # Generate categories
            summaries_context = "\n".join([f"File: {os.path.basename(path)}\nSummary: {summary}" 
                                         for path, summary in file_summaries.items()])
            categories = suggest_content_based_categories(self.client, summaries_context)
            
            # Categorize files
            for file_path, summary in file_summaries.items():
                category = self.categorize_file(summary, categories)
                category = normalize_category(category, self.client)
                
                # Move file to appropriate category folder
                category_path = os.path.join(directory, category)
                os.makedirs(category_path, exist_ok=True)
                new_path = os.path.join(category_path, os.path.basename(file_path))
                os.rename(file_path, new_path)
                print(f"Moved {file_path} to {new_path}")

    def categorize_file(self, summary, categories):
        """Categorize a single file based on its summary"""
        categorize_prompt = f"""Given these categories:
{', '.join(categories)}

Assign this file to exactly ONE of those categories (respond with just the category name).
Choose the most general, appropriate category that fits this content.

File summary: {summary}

Response (just the category name):"""
        
        response = self.client.chat(
            model='mistral',
            messages=[{'role': 'user', 'content': categorize_prompt}]
        )
        return response['message']['content'].strip().lower()

def monitor_folders():
    """Set up folder monitoring"""
    # Ask user for folders to monitor
    print("Enter folders to monitor (one per line, empty line to finish):")
    monitored_folders = []
    while True:
        folder = input().strip()
        if not folder:
            break
        if os.path.isdir(folder):
            monitored_folders.append(folder)
        else:
            print(f"Directory not found: {folder}")
    
    if not monitored_folders:
        print("No valid folders specified.")
        return
    
    # Initialize Ollama client
    client = Client(host="http://localhost:11434")
    
    # Set up event handler and observer
    event_handler = FileChangeHandler(monitored_folders, client)
    observer = Observer()
    
    # Start monitoring each folder
    for folder in monitored_folders:
        observer.schedule(event_handler, folder, recursive=False)
    
    observer.start()
    print(f"\nMonitoring folders:")
    for folder in monitored_folders:
        print(f"- {folder}")
    
    try:
        while True:
            # Check for pending files periodically
            event_handler.process_pending_files()
            time.sleep(300)  # Check every 5 minutes
            
    except KeyboardInterrupt:
        observer.stop()
        print("\nStopping folder monitoring...")
    
    observer.join()

if __name__ == "__main__":
    monitor_folders() 