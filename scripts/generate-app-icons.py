#!/usr/bin/env python3
"""
App Icon Generator for iOS and PWA
Generates all required icon sizes from a source image.

Usage: python3 scripts/generate-app-icons.py
Source: docs/icon.png
Output: words-on-phone-app/ios/App/App/Assets.xcassets/AppIcon.appiconset/
        words-on-phone-app/public/ (PWA icons)
"""

import os
import json
from PIL import Image, ImageFilter
from pathlib import Path

# Icon sizes required for iOS
IOS_ICON_SIZES = [
    # iPhone and iPod touch
    {"size": 20, "scale": 1, "idiom": "iphone", "filename": "icon-20@1x.png"},
    {"size": 20, "scale": 2, "idiom": "iphone", "filename": "icon-20@2x.png"},
    {"size": 20, "scale": 3, "idiom": "iphone", "filename": "icon-20@3x.png"},
    {"size": 29, "scale": 1, "idiom": "iphone", "filename": "icon-29@1x.png"},
    {"size": 29, "scale": 2, "idiom": "iphone", "filename": "icon-29@2x.png"},
    {"size": 29, "scale": 3, "idiom": "iphone", "filename": "icon-29@3x.png"},
    {"size": 40, "scale": 2, "idiom": "iphone", "filename": "icon-40@2x.png"},
    {"size": 40, "scale": 3, "idiom": "iphone", "filename": "icon-40@3x.png"},
    {"size": 60, "scale": 2, "idiom": "iphone", "filename": "icon-60@2x.png"},
    {"size": 60, "scale": 3, "idiom": "iphone", "filename": "icon-60@3x.png"},
    
    # iPad
    {"size": 20, "scale": 1, "idiom": "ipad", "filename": "icon-20@1x~ipad.png"},
    {"size": 20, "scale": 2, "idiom": "ipad", "filename": "icon-20@2x~ipad.png"},
    {"size": 29, "scale": 1, "idiom": "ipad", "filename": "icon-29@1x~ipad.png"},
    {"size": 29, "scale": 2, "idiom": "ipad", "filename": "icon-29@2x~ipad.png"},
    {"size": 40, "scale": 1, "idiom": "ipad", "filename": "icon-40@1x~ipad.png"},
    {"size": 40, "scale": 2, "idiom": "ipad", "filename": "icon-40@2x~ipad.png"},
    {"size": 76, "scale": 1, "idiom": "ipad", "filename": "icon-76@1x~ipad.png"},
    {"size": 76, "scale": 2, "idiom": "ipad", "filename": "icon-76@2x~ipad.png"},
    {"size": 83.5, "scale": 2, "idiom": "ipad", "filename": "icon-83.5@2x~ipad.png"},
    
    # Universal (App Store)
    {"size": 1024, "scale": 1, "idiom": "universal", "platform": "ios", "filename": "icon-1024@1x.png"},
]

# PWA icon sizes
PWA_ICON_SIZES = [
    {"size": 192, "filename": "icon-192x192.png", "purpose": "any"},
    {"size": 512, "filename": "icon-512x512.png", "purpose": "any"},
    {"size": 192, "filename": "icon-192x192-maskable.png", "purpose": "maskable"},
    {"size": 512, "filename": "icon-512x512-maskable.png", "purpose": "maskable"},
]

def ensure_directory(path):
    """Create directory if it doesn't exist."""
    Path(path).mkdir(parents=True, exist_ok=True)

def create_maskable_icon(image, size):
    """Create a maskable icon with safe area padding."""
    # Maskable icons need 10% safe area on all sides
    safe_area = int(size * 0.1)
    content_size = size - (2 * safe_area)
    
    # Create white background
    maskable = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    
    # Resize original image to fit in safe area
    content = image.resize((content_size, content_size), Image.Resampling.LANCZOS)
    
    # Paste content in center
    maskable.paste(content, (safe_area, safe_area), content)
    
    return maskable

def generate_ios_icons(source_image, output_dir):
    """Generate all iOS icon sizes."""
    print(f"Generating iOS icons in {output_dir}")
    ensure_directory(output_dir)
    
    # Generate individual icon files
    generated_images = []
    
    for icon_info in IOS_ICON_SIZES:
        actual_size = int(icon_info["size"] * icon_info["scale"])
        filename = icon_info["filename"]
        
        # Resize image
        resized = source_image.resize((actual_size, actual_size), Image.Resampling.LANCZOS)
        
        # Save as PNG
        output_path = os.path.join(output_dir, filename)
        resized.save(output_path, "PNG", optimize=True)
        
        print(f"  ✓ {filename} ({actual_size}x{actual_size})")
        
        # Build Contents.json entry
        image_entry = {
            "filename": filename,
            "idiom": icon_info["idiom"],
            "scale": f"{icon_info['scale']}x",
            "size": f"{icon_info['size']}x{icon_info['size']}"
        }
        
        if "platform" in icon_info:
            image_entry["platform"] = icon_info["platform"]
            
        generated_images.append(image_entry)
    
    # Generate Contents.json
    contents = {
        "images": generated_images,
        "info": {
            "author": "icon-generator",
            "version": 1
        }
    }
    
    contents_path = os.path.join(output_dir, "Contents.json")
    with open(contents_path, 'w') as f:
        json.dump(contents, f, indent=2)
    
    print(f"  ✓ Contents.json generated with {len(generated_images)} entries")

def generate_pwa_icons(source_image, output_dir):
    """Generate PWA icon sizes."""
    print(f"Generating PWA icons in {output_dir}")
    ensure_directory(output_dir)
    
    for icon_info in PWA_ICON_SIZES:
        size = icon_info["size"]
        filename = icon_info["filename"]
        purpose = icon_info["purpose"]
        
        if purpose == "maskable":
            # Create maskable version with safe area
            icon = create_maskable_icon(source_image, size)
        else:
            # Regular icon
            icon = source_image.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save as PNG
        output_path = os.path.join(output_dir, filename)
        icon.save(output_path, "PNG", optimize=True)
        
        print(f"  ✓ {filename} ({size}x{size}) - {purpose}")

def validate_source_image(image_path):
    """Validate source image meets requirements."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Source image not found: {image_path}")
    
    image = Image.open(image_path)
    width, height = image.size
    
    print(f"Source image: {width}x{height}, mode: {image.mode}")
    
    # Check if image is square
    if width != height:
        print(f"⚠️  Warning: Image is not square ({width}x{height}). Will be resized to square.")
    
    # Check if image is large enough
    min_size = 1024
    if min(width, height) < min_size:
        print(f"⚠️  Warning: Image is smaller than recommended {min_size}x{min_size}")
    
    # Convert to RGBA if needed
    if image.mode != 'RGBA':
        print(f"Converting from {image.mode} to RGBA...")
        image = image.convert('RGBA')
    
    return image

def main():
    """Main execution function."""
    print("🎨 App Icon Generator")
    print("=" * 50)
    
    # Define paths
    source_path = "docs/icon.png"
    ios_output = "words-on-phone-app/ios/App/App/Assets.xcassets/AppIcon.appiconset"
    pwa_output = "words-on-phone-app/public"
    
    try:
        # Validate and load source image
        print("📋 Validating source image...")
        source_image = validate_source_image(source_path)
        
        # Make image square if needed
        width, height = source_image.size
        if width != height:
            size = min(width, height)
            # Center crop to square
            left = (width - size) // 2
            top = (height - size) // 2
            source_image = source_image.crop((left, top, left + size, top + size))
            print(f"✂️  Cropped to square: {size}x{size}")
        
        print(f"✅ Source image ready: {source_image.size[0]}x{source_image.size[1]}")
        print()
        
        # Generate iOS icons
        generate_ios_icons(source_image, ios_output)
        print()
        
        # Generate PWA icons
        generate_pwa_icons(source_image, pwa_output)
        print()
        
        print("🎉 Icon generation complete!")
        print("\nGenerated files:")
        print(f"  • iOS icons: {ios_output}")
        print(f"  • PWA icons: {pwa_output}")
        print("\nNext steps:")
        print("  1. Verify icons in Xcode")
        print("  2. Update PWA manifest.json if needed")
        print("  3. Test on actual devices")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())