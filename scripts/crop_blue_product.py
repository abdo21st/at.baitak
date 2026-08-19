# -*- coding: utf-8 -*-
from PIL import Image
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

img_path = r'C:\Users\phabd\.gemini\antigravity-ide\brain\2e8ae5fe-b9b8-45ce-b925-00443456e3a4\.user_uploaded\media_1787126459293.png'
im = Image.open(img_path)
w, h = im.size
print(f"Original image size: {w}x{h}")

# The blue product thumbnail is on the right side around x: 80% to 98%, y: 20% to 80%
# Let's crop that region
crop_area = (int(w * 0.85), int(h * 0.1), int(w * 0.98), int(h * 0.9))
cropped = im.crop(crop_area)
out_crop = r'I:\at\public\uploads\blue_product_crop.png'
cropped.save(out_crop)
print(f"Saved cropped blue product to {out_crop}")
