import os
import sys
import json
import time
import logging
from openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Token and call limits
TOKEN_LIMIT = 30000
CALL_LIMIT = 5

def test_token_limits():
    """Test various token usage scenarios"""
    logger.info("Starting token limit tests...")
    
    # Test 1: Basic token usage
    logger.info("Test 1: Basic token usage")
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10
        )
        logger.info(f"Test 1 completed. Tokens used: {response.usage.total_tokens}")
    except Exception as e:
        logger.error(f"Test 1 failed: {str(e)}")
    
    # Test 2: Multiple calls
    logger.info("Test 2: Multiple calls")
    for i in range(3):
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": f"Count to {i+1}"}],
                max_tokens=10
            )
            logger.info(f"Call {i+1} completed. Tokens used: {response.usage.total_tokens}")
        except Exception as e:
            logger.error(f"Test 2 call {i+1} failed: {str(e)}")
    
    # Test 3: Large token usage
    logger.info("Test 3: Large token usage")
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Write a long story"}],
            max_tokens=2000
        )
        logger.info(f"Test 3 completed. Tokens used: {response.usage.total_tokens}")
    except Exception as e:
        logger.error(f"Test 3 failed: {str(e)}")
    
    # Test 4: Token limit
    logger.info("Test 4: Token limit")
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Write a very long story"}],
            max_tokens=TOKEN_LIMIT + 1000
        )
        logger.info(f"Test 4 completed. Tokens used: {response.usage.total_tokens}")
    except Exception as e:
        logger.error(f"Test 4 failed (expected): {str(e)}")
    
    # Test 5: Call limit
    logger.info("Test 5: Call limit")
    for i in range(CALL_LIMIT + 2):
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": f"Quick response {i+1}"}],
                max_tokens=10
            )
            logger.info(f"Call {i+1} completed. Tokens used: {response.usage.total_tokens}")
        except Exception as e:
            logger.error(f"Test 5 call {i+1} failed (expected for last calls): {str(e)}")

if __name__ == "__main__":
    test_token_limits()
    logger.info("All tests completed") 