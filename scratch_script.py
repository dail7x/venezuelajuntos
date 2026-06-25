import sys
from PIL import Image, ImageOps

def optimize_og(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGB")
        target_size = (1200, 630)
        # Use ImageOps.fit to resize and crop to exact dimensions
        img_resized = ImageOps.fit(img, target_size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        img_resized.save(output_path, "JPEG", quality=85)
        print(f"Saved OG image to {output_path}")
    except Exception as e:
        print(f"Error optimizing OG image: {e}")

def create_favicon(output_path):
    try:
        # Create a simple 32x32 Venezuela flag
        img = Image.new('RGB', (32, 32))
        pixels = img.load()
        # Yellow, Blue, Red stripes
        for y in range(32):
            for x in range(32):
                if y < 10:
                    pixels[x, y] = (252, 209, 22) # Yellow
                elif y < 21:
                    pixels[x, y] = (0, 56, 168) # Blue
                else:
                    pixels[x, y] = (206, 17, 38) # Red
        # Simple stars in the middle
        # For a 32x32 favicon, detail is lost anyway, maybe just a white arc
        for i in range(8, 24, 2):
            pixels[i, 15] = (255, 255, 255)
        
        img.save(output_path, format="ICO")
        print(f"Saved favicon to {output_path}")
    except Exception as e:
        print(f"Error creating favicon: {e}")

if __name__ == "__main__":
    optimize_og("/Users/dailmarin/Documents/VenezuelaJuntos/fotos/venezuelajuntos.png", "/Users/dailmarin/Documents/VenezuelaJuntos/public/og-image.jpg")
    create_favicon("/Users/dailmarin/Documents/VenezuelaJuntos/public/favicon.ico")
