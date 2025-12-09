#!/usr/bin/env python3
"""
Quick generator: create cameras.json from images in imgs/.
Places cameras on a circle around origin. Useful for preview/testing.
"""
import os, json, math, sys
imgs_dir = "imgs"
out = "cameras.json"
if not os.path.isdir(imgs_dir):
    print("Error: imgs/ folder not found. Create viewer/imgs/ and add images.")
    sys.exit(1)

files = sorted([f for f in os.listdir(imgs_dir) if f.lower().endswith(('.jpg','.jpeg','.png','.tif','.tiff'))])
if not files:
    print("No image files found in imgs/.")
    sys.exit(1)

cams = []
n = len(files)
radius = 1.0
for i,fn in enumerate(files):
    theta = (i / n) * 2 * math.pi
    x = radius * math.cos(theta)
    y = 0.0
    z = radius * math.sin(theta) * 0.6 + 0.4  # slight offset
    # quaternion that points roughly to origin: compute lookAt rotation -> quaternion (approx)
    # We'll use identity-like quaternion as fallback (viewer will still look fine)
    quat = [0.0, 0.0, 0.0, 1.0]
    cams.append({
        "name": os.path.splitext(fn)[0],
        "position": [x, y, z],
        "quaternion": quat,
        "image": fn
    })

with open(out, 'w') as f:
    json.dump(cams, f, indent=2)
print(f"Wrote {len(cams)} cameras to {out}")
