from langchain.agents import create_react_agent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import Ollama
import json
import os

class FileOrganizationAgent:
    def __init__(self, client):
        self.client = client
        self.llm = Ollama(base_url="http://localhost:11434", model="mistral")
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            input_key="instruction",
            return_messages=True
        )
        
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

        ---

        Task:
        Carefully read the user's instruction and apply it to the current file structure.

        Always respond in the following format:

        1. A friendly explanation of what you did (1–2 sentences).
        2. The updated file structure in valid **JSON** format (matching the input structure style, no markdown).

        ---

        💡 Important rules:
        - Do **not** give terminal commands or CLI steps.
        - Do **not** summarize file contents.
        - Do **not** respond in markdown or code blocks.
        - If no changes are needed, return the original structure and explain why.
        - Ensure the JSON is **valid and parsable** — it will be used by a program.
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
        
        print("[DEBUG] User instruction:", message)
        print("[DEBUG] Current file structure:", file_structure_str)

        # Get response from LLM
        response = self.chain.run(
            file_structure=file_structure_str,
            instruction=message
        )
        
        print("[DEBUG] LLM response:", response)
        
        # Check if the response contains a new file structure (in JSON format)
        try:
            # Extract JSON structure if it exists in the response
            new_structure = self.extract_json_from_response(response)
            
            if new_structure:
                # Split response into text and JSON parts
                text_parts = response.split('{')
                text_response = text_parts[0].strip()
                
                return {
                    "message": text_response,
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