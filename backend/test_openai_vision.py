import base64
import sys
import os
from openai import OpenAI

# Initialize OpenAI client
try:
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")
    openai_client = OpenAI(api_key=openai_api_key)
except Exception as e:
    print(f"Failed to initialize OpenAI client: {str(e)}")
    sys.exit(1)


def encode_image_to_base64(image_path):
    """Encode image to base64 string"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


def analyze_image_with_openai(image_path):
    """Analyze image using OpenAI Vision API"""
    try:
        # Encode image to base64
        base64_image = encode_image_to_base64(image_path)
        
        # Create the response request
        response = openai_client.responses.create(
            model="gpt-4o-mini",
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "What's in this image? Provide a concise description."},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "low"
                    },
                ],
            }],
        )
        
        # Print summary for debugging
        print("Generated Summary:")
        print(response.output_text)
        
        # Return the summary as a string
        return f"Image containing {response.output_text.lower()}"
    except Exception as e:
        print(f"Error analyzing image with OpenAI Vision: {str(e)}")
        return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_openai_vision.py <path_to_image>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        sys.exit(1)
        
    summary = analyze_image_with_openai(image_path)
    print("\nReturned Summary:")
    print(summary) 