import moondream as md
from PIL import Image
import sys
import os

def test_moondream(image_path):
    try:
        # Initialize Moondream model
        print("Initializing Moondream model...")
        model = md.vl(model="/Users/sharans/Downloads/moondream-0_5b-int8.mf")
        
        # Load and process image
        print(f"Loading image: {image_path}")
        image = Image.open(image_path)
        
        # Generate caption
        print("Generating caption...")
        result = model.caption(image)
        caption = result["caption"]
        
        print("\nGenerated Caption:")
        print(caption)
        return caption
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_moondream.py <path_to_image>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        sys.exit(1)
        
    test_moondream(image_path) 