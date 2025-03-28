from langchain.agents import create_react_agent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import Ollama
import json
import os
from .initial_organize_electron import normalize_category

class FileOrganizationAgent:
    def __init__(self, client):
        self.client = client
        self.llm = Ollama(base_url="http://localhost:11434", model="mistral")
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        
        self.prompt_template = PromptTemplate(
            input_variables=["file_structure", "instruction", "chat_history"],
            template="""
            You are an AI assistant specialized in organizing files. You're helping a user 
            modify their file organization structure according to their preferences.
            
            Current file structure:
            {file_structure}
            
            User instruction: {instruction}
            
            Previous conversation:
            {chat_history}
            
            Based on the user's instruction, suggest a new organization for the files. 
            Your response should include:
            
            1. A friendly explanation of the changes you're making
            2. A modified file structure in JSON format that matches the original structure's format
            
            Only modify the file structure if the user's instruction is about changing file organization.
            If they're just asking questions, provide information without modifying the structure.
            """
        )
        
        self.chain = LLMChain(
            llm=self.llm,
            prompt=self.prompt_template,
            memory=self.memory
        )
    
    def process_query(self, message, current_file_structure):
        """Process a user query and return response with optional updated file structure"""
        # Convert the file structure to a pretty string representation for the prompt
        file_structure_str = json.dumps(current_file_structure, indent=2)
        
        # Get response from LLM
        response = self.chain.run(
            file_structure=file_structure_str,
            instruction=message
        )
        
        # Check if the response contains a new file structure (in JSON format)
        try:
            # Extract JSON structure if it exists in the response
            new_structure = self.extract_json_from_response(response)
            
            if new_structure:
                return {
                    "message": response.replace(json.dumps(new_structure), "[File structure updated]"),
                    "updatedFileStructure": new_structure
                }
            else:
                return {
                    "message": response,
                    "updatedFileStructure": None
                }
        except Exception as e:
            print(f"Error processing query: {str(e)}")
            return {
                "message": response,
                "updatedFileStructure": None
            }
    
    def extract_json_from_response(self, response):
        """Extract JSON structure from the response if present"""
        try:
            # Look for JSON blocks in the response
            start_idx = response.find('{')
            end_idx = response.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx + 1]
                return json.loads(json_str)
            return None
        except:
            return None 