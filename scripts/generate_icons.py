import sys
from PIL import Image, ImageDraw

def create_hodoork_baytak_icon(size, is_maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    scale = size / 512.0
    
    # Background rounded rectangle (or full for maskable)
    if is_maskable:
        draw.rectangle([0, 0, size, size], fill=(37, 99, 235, 255))
    else:
        radius = int(120 * scale)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(37, 99, 235, 255))
    
    # Draw inner circle (Clock ring)
    cx, cy = size / 2, size / 2
    r = int(170 * scale)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 70), width=int(14 * scale))
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=210, end=40, fill=(56, 189, 248, 255), width=int(14 * scale))
    
    # House Roof for "Baytak"
    roof_w = int(24 * scale)
    draw.line([(140 * scale, 240 * scale), (256 * scale, 135 * scale)], fill=(255, 255, 255, 255), width=roof_w)
    draw.line([(256 * scale, 135 * scale), (372 * scale, 240 * scale)], fill=(255, 255, 255, 255), width=roof_w)
    
    # Medical Cross in center
    cw = int(36 * scale)
    cl = int(105 * scale)
    # Vertical bar
    draw.rounded_rectangle([cx - cw/2, cy - cl/2 + int(10*scale), cx + cw/2, cy + cl/2 + int(10*scale)], radius=int(10*scale), fill=(255, 255, 255, 255))
    # Horizontal bar
    draw.rounded_rectangle([cx - cl/2, cy - cw/2 + int(10*scale), cx + cl/2, cy + cw/2 + int(10*scale)], radius=int(10*scale), fill=(255, 255, 255, 255))
    
    # Center dot
    dot_r = int(8 * scale)
    draw.ellipse([cx - dot_r, cy - dot_r + int(10*scale), cx + dot_r, cy + dot_r + int(10*scale)], fill=(37, 99, 235, 255))
    
    # Bottom-right verification badge (Emerald Green with checkmark)
    bx, by = int(360 * scale), int(360 * scale)
    br = int(52 * scale)
    draw.ellipse([bx - br, by - br, bx + br, by + br], fill=(16, 185, 129, 255), outline=(255, 255, 255, 255), width=int(8*scale))
    
    # Checkmark inside badge
    chk_w = int(8 * scale)
    draw.line([(bx - int(16*scale), by), (bx - int(4*scale), by + int(14*scale))], fill=(255, 255, 255, 255), width=chk_w)
    draw.line([(bx - int(4*scale), by + int(14*scale)), (bx + int(18*scale), by - int(12*scale))], fill=(255, 255, 255, 255), width=chk_w)
    
    return img

print("Generating all high-res PWA & app icons...")
ico_512 = create_hodoork_baytak_icon(512, False)
ico_mask_512 = create_hodoork_baytak_icon(512, True)
ico_192 = create_hodoork_baytak_icon(192, False)
ico_180 = create_hodoork_baytak_icon(180, False)
ico_64 = create_hodoork_baytak_icon(64, False)
ico_32 = create_hodoork_baytak_icon(32, False)

# Save to public/
ico_512.save(r'i:\at\public\icon-512.png', 'PNG')
ico_mask_512.save(r'i:\at\public\maskable-icon-512.png', 'PNG')
ico_192.save(r'i:\at\public\icon-192.png', 'PNG')
ico_180.save(r'i:\at\public\apple-touch-icon.png', 'PNG')
ico_64.save(r'i:\at\public\favicon.png', 'PNG')
ico_512.save(r'i:\at\public\favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)])

# Save to src/app/ for Next.js App Router metadata
ico_512.save(r'i:\at\src\app\icon.png', 'PNG')
ico_180.save(r'i:\at\src\app\apple-icon.png', 'PNG')
ico_512.save(r'i:\at\src\app\favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)])

print("All PWA icons, App Router icons, and maskable icons updated successfully!")
