import faiss
import numpy as np
import json
import os
from typing import List, Dict, Any, Tuple
import pickle

class FaissIndexManager:
    def __init__(self, index_path: str = "data/search_index"):
        self.index_path = index_path
        self.dimension = 384  # Mistral embedding dimension
        self.index = None
        self.file_mapping = {}  # Maps index IDs to file paths
        self.load_or_create_index()
    
    def load_or_create_index(self):
        """Load existing index or create a new one"""
        try:
            if os.path.exists(f"{self.index_path}.index"):
                # Load the FAISS index
                self.index = faiss.read_index(f"{self.index_path}.index")
                
                # Load the file mapping
                with open(f"{self.index_path}.mapping", 'rb') as f:
                    self.file_mapping = pickle.load(f)
            else:
                # Create a new index
                self.index = faiss.IndexFlatL2(self.dimension)
                self.file_mapping = {}
        except Exception as e:
            print(f"Error loading/creating index: {str(e)}")
            self.index = faiss.IndexFlatL2(self.dimension)
            self.file_mapping = {}
    
    def save_index(self):
        """Save the index and file mapping to disk"""
        try:
            # Save the FAISS index
            faiss.write_index(self.index, f"{self.index_path}.index")
            
            # Save the file mapping
            with open(f"{self.index_path}.mapping", 'wb') as f:
                pickle.dump(self.file_mapping, f)
        except Exception as e:
            print(f"Error saving index: {str(e)}")
    
    def add_vectors(self, vectors: List[np.ndarray], file_paths: List[str]):
        """Add vectors and their corresponding file paths to the index"""
        if not vectors or not file_paths:
            return
        
        # Convert vectors to numpy array if they aren't already
        vectors_array = np.array(vectors, dtype=np.float32)
        
        # Add vectors to the index
        start_id = self.index.ntotal
        self.index.add(vectors_array)
        
        # Update file mapping
        for i, file_path in enumerate(file_paths):
            self.file_mapping[start_id + i] = file_path
        
        # Save the updated index
        self.save_index()
    
    def search(self, query_vector: np.ndarray, k: int = 5) -> List[Tuple[str, float]]:
        """Search for similar vectors and return file paths with distances"""
        if self.index.ntotal == 0:
            return []
        
        # Ensure query vector is the right shape
        query_vector = query_vector.reshape(1, -1).astype(np.float32)
        
        # Search the index
        distances, indices = self.index.search(query_vector, k)
        
        # Map indices to file paths and combine with distances
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx in self.file_mapping:
                results.append((self.file_mapping[idx], float(distance)))
        
        return results
    
    def remove_file(self, file_path: str):
        """Remove a file's vector from the index"""
        # Find the index ID for this file
        index_id = None
        for idx, path in self.file_mapping.items():
            if path == file_path:
                index_id = idx
                break
        
        if index_id is not None:
            # Remove the vector from the index
            self.index.remove_ids(np.array([index_id]))
            
            # Update the file mapping
            del self.file_mapping[index_id]
            
            # Save the updated index
            self.save_index()
    
    def get_total_files(self) -> int:
        """Get the total number of files in the index"""
        return len(self.file_mapping) 