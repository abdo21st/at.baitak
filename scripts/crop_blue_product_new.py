# -*- coding: utf-8 -*-
from PIL import Image
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

img_path = r'C:\Users\phabd\.gemini\antigravity-ide\brain\2e8ae5fe-b9b8-45ce-b925-00443456e3a4\.user_uploaded\media_1787126998259.png'
im = Image.open(img_path)
w, h = im.size
print(f"Size of media_1787126998259.png: {w}x{h}")

# The thumbnail is on the right side of the crop
crop_area = (int(w * 0.90), 0, w, h)
cropped = im.crop(crop_area)
out_crop = r'I:\at\public\uploads\blue_product_crop.png'
cropped.save(out_crop)
print(f"Saved cropped blue product to {out_crop}")
