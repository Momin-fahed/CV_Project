# 3D Scene Reconstruction and Virtual Tour  
### CS436: Computer Vision Fundamentals — Group 33  
**Momin Fahed Khan (27100082)**  
**Rayan Kamran (27100039)**  

---

## Abstract

This project implements a three-phase Structure-from-Motion (SfM) pipeline followed by an interactive “Photosynth-style” virtual tour. The system reconstructs camera poses and a sparse 3D point cloud from a sequence of images using feature correspondences, epipolar geometry, triangulation, and incremental pose estimation.

Although the two-view geometry worked correctly, the incremental SfM stage produced extremely sparse reconstructions due to texture-poor indoor scenes and insufficient 2D–3D correspondences. After testing three datasets (tabletop, full room, and corner-of-room), the sparse output remained unusable for visualization.

To overcome this, a dense reconstruction was generated in **Agisoft Metashape**, providing depth-map-based geometry and textures. This dense model was integrated into a custom **Three.js** viewer with smooth pose interpolation and image cross-fading transitions.

**GitHub Repository:** https://github.com/Momin-fahed/CV_Project

---

## 1. Introduction

Reconstructing 3D structure from multiple 2D photographs is a fundamental problem in computer vision, used in applications such as Google Street View, Matterport, and Photosynth. Structure-from-Motion (SfM) solves this by estimating camera poses and scene geometry from overlapping images.

This project implements a three-phase pipeline:

1. **Two-view geometry**  
   Feature matching → Essential Matrix → Pose recovery → Triangulation  
2. **Incremental multiview SfM**  
   2D–3D correspondences → PnP pose estimation → Triangulation → Bundle Adjustment  
3. **Interactive virtual tour in Three.js**  
   Using either sparse SfM output or dense Metashape geometry  

Although the two-view pipeline performed well, incremental SfM remained too sparse for visualization. A dense reconstruction from Agisoft Metashape was therefore used as the geometric scaffold for the final viewer.

---

## 2. Methodology

This section describes the steps used in feature detection, two-view reconstruction, incremental SfM, and the virtual tour implementation.

---

### 2.1 Feature Detection and Matching

Keypoints were detected using a scale- and rotation-invariant detector.  
For each keypoint \( x = (u, v) \), a descriptor \( d \in \mathbb{R}^n \) was extracted.

Matches were computed via nearest-neighbor search and filtered using **Lowe’s ratio test**:

\[
\frac{\| d_i - d_1 \|}{\| d_i - d_2 \|} < 0.75
\]

A **mutual consistency check** ensured symmetric matching.

**Figure 1:** *Feature matches for Phase 1.*

---

### 2.2 Phase 1: Two-View Reconstruction

The **Essential Matrix** \( E \) was estimated from normalized correspondences using RANSAC.

Epipolar constraint:  
\[
\tilde{x}_j^\top E \tilde{x}_i = 0
\]

Pose was recovered via:  
\[
E = [t]_\times R
\]

A cheirality check selected the valid \((R, t)\) pair, and triangulation produced the initial sparse 3D structure.

---

### 2.3 Phase 2: Incremental SfM

New images observe previously triangulated points:

\[
x_{ij} \sim K[R_j \mid t_j]X_i
\]

Camera pose was estimated using **PnP**, minimizing reprojection error:

\[
\sum_i \| x_{ij} - \pi(R_j X_i + t_j) \|^2
\]

New points were triangulated and filtered using:

- High reprojection error  
- Low parallax  
- Negative depth  

A global **Bundle Adjustment (BA)** step refined all poses and 3D points.

However, the reconstruction remained extremely sparse because:

- Not enough 2D–3D correspondences  
- PnP became unstable  
- Data was captured with limited parallax  

This phase used a dataset similar to the final one but with slightly different lighting and camera angles.

**Figure 2:** *Sparse map from incremental SfM.*

---

### 2.4 Phase 3: Photosynth-Style Viewer

For visualization, a dense 3D model was generated using **Agisoft Metashape**:

- Depth maps were computed for each image  
- A dense point cloud was fused from these maps  
- Textures were baked onto the geometry  

This dense, textured model was imported into the Three.js viewer.

Camera poses estimated from SfM were used as navigation nodes. The viewer supports:

- **Linear interpolation (lerp)** for camera positions  
- **Spherical interpolation (slerp)** for orientations  
- **Cross-faded imagery** during transitions  
- **Rendering of the dense point cloud** to enhance depth perception  

---

## 3. Experiments and Results

Three datasets were captured to test the pipeline:

### **Tabletop Dataset**
- Produced good feature matches.  
- Two-view results were correct.  
- Insufficient parallax resulted in almost no new triangulated points.  
- PnP pose estimates were unstable.

### **Full-Room Dataset**
- Walls and furniture lacked texture.  
- SIFT found almost no repeatable keypoints.  
- Incremental SfM collapsed immediately.

### **Corner-of-Room Dataset**
- Most consistent matches.  
- Pose estimates were reasonably stable.  
- Final point cloud still too sparse for visualization.

**Summary:**  
Poses and geometry were technically correct, but the sparse reconstructions were unusable.  
Dense reconstruction via Metashape produced far better geometry and textures.

---

## 4. Discussion

Sparse SfM struggled because indoor scenes often violate its assumptions:

### Why Sparse Reconstruction Failed
- **Textureless surfaces:** Walls, floors, and tables provide few keypoints.  
- **Repetitive patterns:** Tiles and carpets create ambiguous matches.  
- **Low parallax:** Small sideways motion limits triangulation.  
- **PnP drift:** Pose errors accumulate across frames.

### Why Metashape Succeeded
Metashape uses dense, pixel-wise multiview stereo:

- **Dense MVS:** Computes similarity for every pixel.  
- **Patch-based depth refinement:** Propagates depth locally.  
- **Depth-map fusion:** Merges many views into a smooth model.  

This enables reconstruction of texture-poor surfaces that sparse SfM cannot recover.

---

## 5. Conclusion

This project implemented a full SfM pipeline and an interactive 3D virtual tour. While two-view reconstruction worked reliably, incremental SfM produced sparse point clouds unsuitable for visualization.

A dense reconstruction generated with **Agisoft Metashape** solved this issue.  
Integrating this model with Three.js allowed smooth camera navigation using pose interpolation and image cross-fading.

The final system demonstrates a hybrid workflow:  
**camera pose recovery via SfM + dense geometry via external MVS.**

---
