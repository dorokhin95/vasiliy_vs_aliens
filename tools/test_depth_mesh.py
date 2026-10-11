import cv2
import numpy as np
from PIL import Image
import os

def generate_toad_3d_obj(img_path, obj_path, grid_step=4, thickness=0.32):
    im = Image.open(img_path)
    w, h = im.size
    rgba = np.array(im)
    alpha = rgba[:, :, 3]
    rgb = rgba[:, :, :3]
    
    # 1. Binary mask and distance transform
    mask = (alpha > 40).astype(np.uint8)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    max_d = dist.max()
    norm_dist = dist / (max_d + 1e-5)
    
    # Spherical inflation profile (round cross-section)
    depth = np.sin(norm_dist * (np.pi / 2)) ** 0.65
    
    # High-frequency details from luminance (emboss details like sign, muscles)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    gray_blur = cv2.GaussianBlur(gray, (15, 15), 0)
    high_freq = (gray - gray_blur)
    
    # Combine smooth volumetric depth + surface relief
    total_depth = np.clip(depth * 0.85 + high_freq * 0.15, 0, 1.0) * mask
    
    # 2. Downsample grid for 3D mesh
    xs = np.arange(0, w, grid_step)
    ys = np.arange(0, h, grid_step)
    
    sub_mask = mask[::grid_step, ::grid_step]
    sub_depth = total_depth[::grid_step, ::grid_step]
    
    grid_h, grid_w = sub_mask.shape
    
    # Vertex indexing
    # Front vertices, Back vertices
    front_indices = np.full((grid_h, grid_w), -1, dtype=int)
    back_indices = np.full((grid_h, grid_w), -1, dtype=int)
    
    vertices = []
    uvs = []
    normals = []
    
    v_count = 1 # OBJ 1-indexed
    
    # Normal scale in meters
    # World width ~1.2m, height ~1.8m
    scale_x = 1.25 / w
    scale_y = 1.85 / h
    
    for r in range(grid_h):
        for c in range(grid_w):
            if sub_mask[r, c] > 0:
                px = c * grid_step
                py = r * grid_step
                
                # Center around hips/origin (px centered at 0, py inverted so feet at Z=0)
                vx = (px - w / 2.0) * scale_x
                vz = (h - py) * scale_y # height along Z
                
                d = sub_depth[r, c]
                # Y is depth (forward is -Y or +Y, in Blender Z is up, Y is forward/backward)
                vy_front = -d * thickness
                vy_back = d * thickness * 0.75
                
                u = px / float(w)
                v = 1.0 - (py / float(h))
                
                # Front vertex
                front_indices[r, c] = v_count
                vertices.append((vx, vy_front, vz))
                uvs.append((u, v))
                v_count += 1
                
                # Back vertex
                back_indices[r, c] = v_count
                vertices.append((vx, vy_back, vz))
                uvs.append((1.0 - u, v)) # Mirrored UV for back
                v_count += 1

    # 3. Create Faces (Quads / Triangles)
    faces = []
    
    # Front & Back faces
    for r in range(grid_h - 1):
        for c in range(grid_w - 1):
            f_tl = front_indices[r, c]
            f_tr = front_indices[r, c + 1]
            f_bl = front_indices[r + 1, c]
            f_br = front_indices[r + 1, c + 1]
            
            b_tl = back_indices[r, c]
            b_tr = back_indices[r, c + 1]
            b_bl = back_indices[r + 1, c]
            b_br = back_indices[r + 1, c + 1]
            
            # If all 4 front exist
            if f_tl != -1 and f_tr != -1 and f_bl != -1 and f_br != -1:
                faces.append((f_tl, f_bl, f_br, f_tr)) # Front (winding ccw)
                faces.append((b_tl, b_tr, b_br, b_bl)) # Back (reversed winding)
            else:
                # Triangles if 3 exist
                if f_tl != -1 and f_bl != -1 and f_tr != -1:
                    faces.append((f_tl, f_bl, f_tr))
                    faces.append((b_tl, b_tr, b_bl))
                elif f_tr != -1 and f_bl != -1 and f_br != -1:
                    faces.append((f_tr, f_bl, f_br))
                    faces.append((b_tr, b_br, b_bl))
                elif f_tl != -1 and f_tr != -1 and f_br != -1:
                    faces.append((f_tl, f_br, f_tr))
                    faces.append((b_tl, b_tr, b_br))
                elif f_tl != -1 and f_bl != -1 and f_br != -1:
                    faces.append((f_tl, f_bl, f_br))
                    faces.append((b_tl, b_br, b_bl))

            # Rim faces (seam between front and back on edge of silhouette)
            # Check horizontal edge
            if (f_tl != -1) != (f_tr != -1):
                if f_tl != -1 and f_bl != -1:
                    faces.append((f_tl, b_tl, b_bl, f_bl))
            # Check vertical edge
            if (f_tl != -1) != (f_bl != -1):
                if f_tl != -1 and f_tr != -1:
                    faces.append((f_tl, f_tr, b_tr, b_tl))

    # Write OBJ file
    os.makedirs(os.path.dirname(obj_path), exist_ok=True)
    with open(obj_path, 'w') as f:
        f.write("# Toad Grunt 3D Volumetric Mesh\n")
        f.write(f"mtllib toad_grunt.mtl\n")
        f.write(f"usemtl Mat_Toad_Grunt\n")
        for vx, vy, vz in vertices:
            f.write(f"v {vx:.5f} {vy:.5f} {vz:.5f}\n")
        for u, v in uvs:
            f.write(f"vt {u:.5f} {v:.5f}\n")
        for face in faces:
            if len(face) == 4:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]} {face[3]}/{face[3]}\n")
            elif len(face) == 3:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]}\n")

    print(f"Generated 3D OBJ with {len(vertices)} vertices and {len(faces)} faces at: {obj_path}")

if __name__ == "__main__":
    generate_toad_3d_obj(
        'assets/enemies/toad_grunt_perfect.png',
        'blender_assets/toad_grunt_volumetric.obj',
        grid_step=8, # 128x128 grid for smooth organic mesh
        thickness=0.38
    )
