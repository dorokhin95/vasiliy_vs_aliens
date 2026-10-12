import bpy
import bmesh
import math
import os
import numpy as np

BUILDING_MODELS = [
    {
        'id': 'building_khrushchevka',
        'in_glb': 'blender_assets/cat3_concepts/building_khrushchevka_generated.glb',
        'clean_png': 'blender_assets/cat3_concepts/building_khrushchevka_clean.png',
        'out_glb': 'assets/models/building_khrushchevka.glb',
        'target_span': 4.8,
        'target_verts': 4800,
        'tint': 0.90,
        'extra_rot_z': 0,
    },
    {
        'id': 'building_brezhnevka',
        'in_glb': 'blender_assets/cat3_concepts/building_brezhnevka_generated.glb',
        'clean_png': 'blender_assets/cat3_concepts/building_brezhnevka_clean.png',
        'out_glb': 'assets/models/building_brezhnevka.glb',
        'target_span': 4.6,
        'target_verts': 4800,
        'tint': 0.88,
        'extra_rot_z': 0,
    },
    {
        'id': 'building_boiler_house',
        'in_glb': 'blender_assets/cat3_concepts/building_boiler_house_generated.glb',
        'clean_png': 'blender_assets/cat3_concepts/building_boiler_house_clean.png',
        'out_glb': 'assets/models/building_boiler_house.glb',
        'target_span': 4.8,
        'target_verts': 4800,
        'tint': 0.88,
        'extra_rot_z': 0,
    },
    {
        'id': 'building_military_hq',
        'in_glb': 'blender_assets/cat3_concepts/building_military_hq_generated.glb',
        'clean_png': 'blender_assets/cat3_concepts/building_military_hq_clean.png',
        'out_glb': 'assets/models/building_military_hq.glb',
        'target_span': 4.8,
        'target_verts': 4800,
        'tint': 0.90,
        'extra_rot_z': 0,
    },
]

def build_3d_architectural_mesh_from_concept(cfg):
    """
    Constructs a watertight 3D volumetric architectural mesh in Blender 4.2 directly from
    the cleaned concept art PNG when the remote Rodin CDN file is unavailable.
    """
    clean_path = os.path.abspath(cfg['clean_png'])
    src_img = bpy.data.images.load(clean_path)
    orig_w, orig_h = src_img.size[0], src_img.size[1]
    aspect = orig_w / float(max(1, orig_h))

    # Scale texture to 512x512 and apply subtle dusk grading
    tex_img = src_img.copy()
    tex_img.name = cfg['id'] + "_tex"
    tex_img.scale(512, 512)
    px = np.array(tex_img.pixels[:], dtype=np.float32).reshape((512, 512, 4))
    tint = cfg.get('tint', 0.90)
    px[:, :, :3] = np.clip(px[:, :, :3] * tint, 0.0, 1.0)
    tex_img.pixels[:] = px.ravel().tolist()
    tex_img.update()
    tex_img.pack()

    # Create grid image for 3D relief sampling (note: Blender image pixels are bottom-to-top row order!)
    nx = 60
    ny = max(36, int(round(nx / max(aspect, 0.6))))
    grid_img = src_img.copy()
    grid_img.scale(nx, ny)
    # Flip vertically so iy=0 is top row, iy=ny-1 is bottom row
    g_arr = np.flipud(np.array(grid_img.pixels[:], dtype=np.float32).reshape((ny, nx, 4)))
    alpha_grid = g_arr[:, :, 3]
    luma_grid = 0.299 * g_arr[:, :, 0] + 0.587 * g_arr[:, :, 1] + 0.114 * g_arr[:, :, 2]

    mesh = bpy.data.meshes.new(cfg['id'] + "_mesh")
    obj = bpy.data.objects.new(cfg['id'], mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")

    # Pitch angle of ThreePropsManager camera is 28 degrees
    pitch = math.radians(28.0)
    cos_p = math.cos(pitch)
    sin_p = math.sin(pitch)

    span_x = cfg['target_span']
    span_v = span_x / aspect

    front_verts = {}
    back_verts = {}

    for iy in range(ny):
        for ix in range(nx):
            if alpha_grid[iy, ix] < 0.22:
                continue
            # Normalized screen-plane coordinates u in [0,1], v in [0,1] (bottom to top)
            u = ix / float(nx - 1)
            v = 1.0 - (iy / float(ny - 1))

            sx = (u - 0.5) * span_x
            sv = (v - 0.5) * span_v

            # Architectural 3D depth profile (front corner at u~0.68 protrudes toward camera -Y)
            corner_dist = abs(u - 0.68)
            arch_bulge = max(0.0, 1.0 - corner_dist * 1.45) * 0.42
            relief = (luma_grid[iy, ix] - 0.45) * 0.14
            depth_front = arch_bulge + relief
            depth_back = -0.38

            # Convert camera-space (sx, sv, depth) into world (X, Y, Z) so that at 28-deg pitch
            # the projection onto the camera plane is exact (sx, sv), while depth shifts along camera ray!
            # Camera looks from (0, -cos_p, sin_p) toward origin:
            # View Up vector is (0, sin_p, cos_p), View Forward (toward camera) is (0, -cos_p, sin_p)
            wx_f = sx
            wy_f = sv * sin_p - depth_front * cos_p
            wz_f = sv * cos_p + depth_front * sin_p

            wx_b = sx
            wy_b = sv * sin_p - depth_back * cos_p
            wz_b = sv * cos_p + depth_back * sin_p

            vf = bm.verts.new((wx_f, wy_f, wz_f))
            vb = bm.verts.new((wx_b, wy_b, wz_b))
            front_verts[(ix, iy)] = (vf, u, v)
            back_verts[(ix, iy)] = (vb, u, v)

    # Create front relief faces + back faces + boundary side walls
    for iy in range(ny - 1):
        for ix in range(nx - 1):
            keys = [(ix, iy), (ix + 1, iy), (ix + 1, iy + 1), (ix, iy + 1)]
            if all(k in front_verts for k in keys):
                # Front quad (counter-clockwise facing camera -Y/+Z)
                f_quad = [front_verts[keys[3]][0], front_verts[keys[2]][0], front_verts[keys[1]][0], front_verts[keys[0]][0]]
                uvs = [
                    (front_verts[keys[3]][1], front_verts[keys[3]][2]),
                    (front_verts[keys[2]][1], front_verts[keys[2]][2]),
                    (front_verts[keys[1]][1], front_verts[keys[1]][2]),
                    (front_verts[keys[0]][1], front_verts[keys[0]][2]),
                ]
                try:
                    face = bm.faces.new(f_quad)
                    for loop, uv in zip(face.loops, uvs):
                        loop[uv_layer].uv = uv
                except ValueError:
                    pass

                # Back quad
                b_quad = [back_verts[keys[0]][0], back_verts[keys[1]][0], back_verts[keys[2]][0], back_verts[keys[3]][0]]
                try:
                    face_b = bm.faces.new(b_quad)
                    for loop, uv in zip(face_b.loops, reversed(uvs)):
                        loop[uv_layer].uv = uv
                except ValueError:
                    pass

                # Connect boundary edges to close the 3D volume
                neighbors = [
                    ((ix, iy - 1), keys[0], keys[1]),
                    ((ix + 1, iy), keys[1], keys[2]),
                    ((ix, iy + 1), keys[2], keys[3]),
                    ((ix - 1, iy), keys[3], keys[0]),
                ]
                for nb_cell, k_a, k_b in neighbors:
                    nx_c, ny_c = nb_cell
                    is_boundary = (
                        nx_c < 0 or nx_c >= nx - 1 or ny_c < 0 or ny_c >= ny - 1 or
                        not all((nx_c + dx, ny_c + dy) in front_verts for dx in (0, 1) for dy in (0, 1))
                    )
                    if is_boundary:
                        va_f, ua, va_uv = front_verts[k_a]
                        vb_f, ub, vb_uv = front_verts[k_b]
                        va_b = back_verts[k_a][0]
                        vb_b = back_verts[k_b][0]
                        try:
                            side_face = bm.faces.new([va_f, vb_f, vb_b, va_b])
                            for loop, uv in zip(side_face.loops, [(ua, va_uv), (ub, vb_uv), (ub, vb_uv), (ua, va_uv)]):
                                loop[uv_layer].uv = uv
                        except ValueError:
                            pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    # Smooth shading with weighted normals
    for poly in mesh.polygons:
        poly.use_smooth = True

    # Create PBR Material with baked texture
    mat = bpy.data.materials.new(name=cfg['id'] + "_mat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs['Roughness'].default_value = 0.88
        bsdf.inputs['Metallic'].default_value = 0.05
        tex_node = nodes.new('ShaderNodeTexImage')
        tex_node.image = tex_img
        links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
    obj.data.materials.append(mat)
    return obj

def process_building_model(cfg):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    in_path = os.path.abspath(cfg['in_glb'])

    use_rodin_glb = os.path.exists(in_path) and os.path.getsize(in_path) > 1000000
    if use_rodin_glb:
        print(f"[{cfg['id']}] Importing downloaded Rodin 3D GLB ({os.path.getsize(in_path)//1024} KB)...")
        bpy.ops.import_scene.gltf(filepath=in_path)
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        bpy.ops.object.select_all(action='DESELECT')
        for m in meshes:
            m.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        if len(meshes) > 1:
            bpy.ops.object.join()
        obj = bpy.context.active_object
        obj.name = cfg['id']
        obj.rotation_mode = 'XYZ'

        if obj.parent:
            bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
        for o in list(bpy.context.scene.objects):
            if o != obj:
                bpy.data.objects.remove(o, do_unlink=True)

        obj.rotation_mode = 'XYZ'
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Decimate mesh to target_verts for locked 60 FPS WebGL rendering
        v_before = len(obj.data.vertices)
        target_v = cfg.get('target_verts', 4800)
        if v_before > target_v * 1.15:
            ratio = max(0.10, min(1.0, target_v / float(v_before)))
            bpy.context.view_layer.objects.active = obj
            mod = obj.modifiers.new(name="FastDecimate", type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)
        v_after = len(obj.data.vertices)

        tint = cfg.get('tint', 1.0)
        for img in bpy.data.images:
            if img.size[0] > 512 or img.size[1] > 512:
                img.scale(512, 512)
            is_srgb = (getattr(img, 'colorspace_settings', None) and img.colorspace_settings.name == 'sRGB')
            if is_srgb and tint < 0.99 and img.pixels:
                px = np.array(img.pixels[:], dtype=np.float32).reshape((-1, 4))
                px[:, :3] = np.clip(px[:, :3] * tint, 0.0, 1.0)
                img.pixels[:] = px.ravel().tolist()
                img.update()

        verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
        xs = [v.x for v in verts]
        ys = [v.y for v in verts]
        dx = max(xs) - min(xs)
        dy = max(ys) - min(ys)
        if dy > dx * 1.08:
            obj.rotation_mode = 'XYZ'
            obj.rotation_euler = (0, 0, math.radians(90))
            bpy.ops.object.transform_apply(rotation=True)

        if cfg.get('extra_rot_z'):
            obj.rotation_mode = 'XYZ'
            obj.rotation_euler = (0, 0, math.radians(cfg['extra_rot_z']))
            bpy.ops.object.transform_apply(rotation=True)
        print(f"[{cfg['id']}] Rodin mesh decimated: {v_before} -> {v_after} verts")
    else:
        print(f"[{cfg['id']}] Building 3D architectural relief mesh from concept art in Blender 4.2...")
        obj = build_3d_architectural_mesh_from_concept(cfg)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

    verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    xs = [v.x for v in verts]
    ys = [v.y for v in verts]
    zs = [v.z for v in verts]
    dx = max(xs) - min(xs)
    dy = max(ys) - min(ys)
    dz = max(zs) - min(zs)

    max_dim = max(dx, dy, dz, 1e-4)
    s = cfg['target_span'] / max_dim
    obj.scale = (s, s, s)
    bpy.ops.object.transform_apply(scale=True)

    verts = [v.co for v in obj.data.vertices]
    cx = (min(v.x for v in verts) + max(v.x for v in verts)) * 0.5
    cy = (min(v.y for v in verts) + max(v.y for v in verts)) * 0.5
    min_z = min(v.z for v in verts)
    max_z = max(v.z for v in verts)
    height = max_z - min_z

    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= min_z
    obj.data.update()

    out_path = os.path.abspath(cfg['out_glb'])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_image_format='WEBP',
        export_image_quality=86
    )
    print(f"[{cfg['id']}] Exported 3D GLB -> {out_path} ({os.path.getsize(out_path)//1024} KB, {len(obj.data.vertices)} verts)")

    # Render preview angles
    prev_dir = os.path.abspath("assets/models/preview")
    os.makedirs(prev_dir, exist_ok=True)

    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, height * 0.48))
    target = bpy.context.active_object

    cam_dist = cfg['target_span'] * 2.3
    pitch = math.radians(28)
    bpy.ops.object.camera_add(location=(0, -cam_dist * math.cos(pitch), cam_dist * math.sin(pitch)))
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = cfg['target_span'] * 1.15
    bpy.context.scene.camera = cam

    tt = cam.constraints.new(type='TRACK_TO')
    tt.target = target
    tt.track_axis = 'TRACK_NEGATIVE_Z'
    tt.up_axis = 'UP_Y'

    bpy.ops.object.light_add(type='SUN', location=(4, -5, 7))
    sun = bpy.context.active_object
    sun.data.energy = 3.6
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(-30))

    bpy.ops.object.light_add(type='SUN', location=(-4, 4, 5))
    fill = bpy.context.active_object
    fill.data.energy = 1.8

    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.resolution_x = 256
    bpy.context.scene.render.resolution_y = 256

    obj.rotation_mode = 'XYZ'
    for angle_name, deg in [('front', 0), ('iso', 22.5)]:
        obj.rotation_euler = (0, 0, math.radians(deg))
        bpy.context.scene.render.filepath = os.path.join(prev_dir, f"{cfg['id']}_{angle_name}.png")
        bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    for m in BUILDING_MODELS:
        process_building_model(m)
