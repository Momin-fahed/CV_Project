# 3D Scene Reconstruction and Virtual Tour - CS436 Project

This repository contains the implementation of a **Structure from Motion (SfM)** pipeline and 3D scene reconstruction project for CS436: Computer Vision Fundamentals. The goal is to convert a collection of 2D images into a sparse 3D point cloud and prepare the system for a virtual tour application. This README covers the project progress up to **Week 3**.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Dataset Collection](#dataset-collection)
3. [Environment Setup](#environment-setup)
4. [Implementation](#implementation)
    - [Week 1: Setup & Feature Matching](#week-1-setup--feature-matching)
    - [Week 2: Two-View Reconstruction](#week-2-two-view-reconstruction)
    - [Week 3: Multi-View SfM & Refinement](#week-3-multi-view-sfm--refinement)
5. [Running the Code](#running-the-code)
6. [Output Visualization](#output-visualization)
7. [Dependencies](#dependencies)

---

## Project Overview
This project aims to build a pipeline that can reconstruct a 3D scene from a series of 2D images. The pipeline consists of three main phases completed so far:

1. **Feature Matching:** Detect and match keypoints across images.
2. **Two-View Reconstruction:** Compute the Essential matrix, recover camera pose, and triangulate points to generate a sparse 3D point cloud.
3. **Multi-View SfM & Refinement:** Incrementally add more views using PnP, expand the map, and refine the reconstruction to reduce drift.

The final objective is to create an interactive 3D tour (Week 4 onwards).

---

## Dataset Collection
- **Scene Selection:** Static, well-lit, and textured scenes (e.g., a cluttered desk or bookshelf). Avoid blank walls and reflective surfaces.
- **Camera Motion:** Move the camera physically between shots (not just rotate). Ensure parallax for depth perception.
- **Overlap:** 60–80% overlap between consecutive images.
- **Consistency:** Maintain uniform lighting and sharp focus. Use "pro" mode to lock exposure if available.
- **Image Count:** 15–30 images per scene is recommended.

---

## Environment Setup
1. **Python version:** 3.10+
2. **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
   *(Dependencies listed below)*

---

## Implementation

### Week 1: Setup & Feature Matching
- Implemented SIFT/ORB feature detection.
- Filtered matches using Lowe’s ratio test.
- Visualized filtered matches between image pairs.
- **Output:** Visual comparison images showing matched features.

### Week 2: Two-View Reconstruction
- Constructed camera intrinsic matrix `K`.
- Estimated **Essential Matrix** using `cv2.findEssentialMat` with RANSAC.
- Recovered camera pose using `cv2.recoverPose` and performed cheirality check to disambiguate.
- Triangulated 3D points from matched features.
- **Output:** Sparse 3D point cloud saved as `.ply` file.

### Week 3: Multi-View SfM & Refinement
- Incrementally added additional views using **PnP** (`cv2.solvePnPRansac`) to localize cameras.
- Triangulated new points to expand the 3D map.
- Applied refinement (Bundle Adjustment) to reduce drift and improve reconstruction consistency.
- **Output:** Refined multi-view sparse point cloud.

## Output Visualization
- **Feature Matches:** Images showing SIFT/ORB matches between image pairs.
- **Sparse Point Cloud:** `.ply` files viewable with [Open3D](http://www.open3d.org/) or MeshLab.
- **Refinement:** Multi-view point cloud with reduced drift.

---

## Dependencies
- Python 3.10+
- OpenCV (`opencv-python`)
- NumPy
- Open3D
- Matplotlib (optional for plotting matches)

```bash
pip install opencv-python numpy open3d matplotlib
