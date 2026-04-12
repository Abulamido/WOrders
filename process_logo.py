import sys
import subprocess

try:
    from PIL import Image, ImageOps
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageOps

def process_image(input_path, output_path):
    # Open image and convert to RGBA
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    # lemon green RGB: roughly (173, 255, 47) or (166, 226, 46) 
    # Let's use #ADFF2F (173, 255, 47)
    target_color = (173, 255, 47, 255)

    for item in data:
        r, g, b, a = item
        # If it's mostly white or very bright, make it transparent
        if r > 200 and g > 200 and b > 200:
            new_data.append((255, 255, 255, 0))
        # If it's dark/blackish, turn it to lemon green
        elif r < 100 and g < 100 and b < 100 and a > 50:
            # We can map intensity to alpha if needed, but solid color is fine
            new_data.append(target_color)
        else:
            new_data.append(item)

    img.putdata(new_data)

    # Calculate padding/resizing so it appears larger.
    # Currently user says "resize as its too small now"
    # Actually, we can just crop the bounding box of non-transparent pixels,
    # then the browser CSS will naturally scale it up since it won't have empty bounding margins.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # Resize up by 2x to ensure it's higher res
    img = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)

    img.save(output_path, "PNG")

if __name__ == "__main__":
    process_image("public/logo.png", "public/logo.png")
