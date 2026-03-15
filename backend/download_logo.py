import urllib.request
from PIL import Image
import io

print("Downloading logo...")
req = urllib.request.Request('https://mitacsc.ac.in/img/logo.webp', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    img_data = response.read()

print("Converting logo to PNG...")
image = Image.open(io.BytesIO(img_data)).convert("RGBA")

# Create a white background layer
bg = Image.new("RGBA", image.size, (255, 255, 255, 255))
out = Image.alpha_composite(bg, image)

out.save('./public/mit_acsc_logo.png', 'PNG')
print("Successfully saved to ./public/mit_acsc_logo.png")
