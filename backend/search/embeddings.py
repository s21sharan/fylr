import numpy as np
from typing import List, Dict, Any
import json

class EmbeddingsGenerator:
    def __init__(self, client):
        self.client = client
        self.embedding_prompt = """
        You are a text embedding model. Your task is to convert the following text into a meaningful vector representation.
        The text should be embedded in a way that captures its semantic meaning and can be used for similarity search.
        
        Text to embed:
        {text}
        
        Return ONLY a JSON array of 384 floating point numbers representing the embedding vector.
        Do not include any other text or explanation.
        """
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for a given text using Ollama"""
        try:
            # Prepare the prompt
            prompt = self.embedding_prompt.format(text=text)
            
            # Get response from Ollama
            response = self.client.chat(
                model='mistral',
                messages=[{'role': 'user', 'content': prompt}],
                options={"temperature": 0}
            )
            
            # Parse the response
            embedding = json.loads(response['message']['content'])
            
            # Convert to numpy array
            return np.array(embedding, dtype=np.float32)
            
        except Exception as e:
            print(f"Error generating embedding: {str(e)}")
            return None
    
    def generate_embeddings_batch(self, texts: List[str], batch_size: int = 5) -> List[np.ndarray]:
        """Generate embeddings for a batch of texts"""
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = []
            
            for text in batch:
                embedding = self.generate_embedding(text)
                if embedding is not None:
                    batch_embeddings.append(embedding)
            
            embeddings.extend(batch_embeddings)
        
        return embeddings 