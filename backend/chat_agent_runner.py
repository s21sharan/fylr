# backend/chat_agent_runner.py
import json
import sys
from chat_agent import FileOrganizationAgent

def main():
    # Read the input config file (passed as the first argument)
    with open(sys.argv[1], 'r') as f:
        config = json.load(f)

    message = config['message']
    file_structure = config['currentFileStructure']

    agent = FileOrganizationAgent(client=None)
    result = agent.process_query(message, file_structure)

    # Output result in one JSON line
    print(json.dumps(result))

if __name__ == '__main__':
    main()