import bpy
import bmesh
import math
import os

def add_uv_box(bm, uv_layer, cx, cy, cz, sx, sy, sz, uv_front, uv_back, uv_left, uv_right, uv_top, uv_bottom=None):
    """
    Adds an axis-aligned 3D box centered at (cx, cy, cz) with dimensions (sx, sy, sz)
    and assigns explicit UV rectangles (u0, v0, u1, v1) to each face.
    Note: In Blender, UV (0,0) is bottom-left and (1,1) is top-right.
    """
    hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
    # 8 corners
    v000 = bm.verts.new((cx - hx, cy - hy, cz - hz))
    v100 = bm.verts.new((cx + hx, cy - hy, cz - hz))
    v110 = bm.verts.new((cx + hx, cy + hy, cz - hz))
    v010 = bm.verts.new((cx - hx, cy + hy, cz - hz))
    v001 = bm.verts.new((cx - hx, cy - hy, cz + hz))
    v101 = bm.verts.new((cx + hx, cy - hy, cz + hz))
    v111 = bm.verts.new((cx + hx, cy + hy, cz + hz))
    v011 = bm.verts.new((cx - hx, cy + hy, cz + hz))

    def make_quad(verts, uv_rect):
        if uv_rect is None:
            return
        u0, v0, u1, v1 = uv_rect
        f = bm.faces.new(verts)
        uvs = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
        for loop, uv in zip(f.loops, uvs):
            loop[uv_layer].uv = uv

    # Front (-Y): bottom-left v000, bottom-right v100, top-right v101, top-left v001
    make_quad([v000, v100, v101, v001], uv_front)
    # Back (+Y): bottom-left v110, bottom-right v010, top-right v011, top-left v111
    make_quad([v110, v010, v011, v111], uv_back)
    # Right (+X): bottom-left v100, bottom-right v110, top-right v111, top-left v101
    make_quad([v100, v110, v111, v101], uv_right)
    # Left (-X): bottom-left v010, bottom-right v000, top-right v001, top-left v011
    make_quad([v010, v000, v001, v011], uv_left)
    # Top (+Z): front-left v001, front-right v101, back-right v111, back-left v011
    make_quad([v001, v101, v111, v011], uv_top)
    # Bottom (-Z)
    if uv_bottom:
        make_quad([v010, v110, v100, v000], uv_bottom)

def create_pbr_material(name, atlas_path):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    bsdf.inputs['Roughness'].default_value = 0.86
    bsdf.inputs['Metallic'].default_value = 0.08
    tex = nodes.new('ShaderNodeTexImage')
    img = bpy.data.images.load(os.path.abspath(atlas_path))
    img.pack()
    tex.image = img
    links.new(bsdf.inputs['Base Color'], tex.outputs['Color'])
    return mat

def export_and_preview(obj, out_glb, target_span=4.8):
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

    out_path = os.path.abspath(out_glb)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_image_format='WEBP',
        export_image_quality=88
    )
    print(f"[Exported] {out_path} ({os.path.getsize(out_path)//1024} KB, {len(obj.data.vertices)} verts)")

    prev_dir = os.path.abspath("assets/models/preview")
    os.makedirs(prev_dir, exist_ok=True)

    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, height * 0.48))
    target = bpy.context.active_object

    cam_dist = target_span * 2.3
    pitch = math.radians(28)
    bpy.ops.object.camera_add(location=(0, -cam_dist * math.cos(pitch), cam_dist * math.sin(pitch)))
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = target_span * 1.15
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
        bpy.context.scene.render.filepath = os.path.join(prev_dir, f"{obj.name}_{angle_name}.png")
        bpy.ops.render.render(write_still=True)

def build_khrushchevka():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mesh = bpy.data.meshes.new("building_khrushchevka_mesh")
    obj = bpy.data.objects.new("building_khrushchevka", mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")

    # Atlas layout (512x512, Blender UV v=0 at bottom, v=1 at top):
    # Top half (v: 0.50..1.00, u: 0.00..1.00): Front Facade
    # Bottom-left (v: 0.00..0.50, u: 0.00..0.50): Side Wall
    # Bottom-right (v: 0.00..0.50, u: 0.50..1.00): Roof
    uv_front = (0.01, 0.51, 0.99, 0.99)
    uv_side  = (0.02, 0.02, 0.48, 0.48)
    uv_roof  = (0.53, 0.03, 0.97, 0.47)
    uv_conc  = (0.51, 0.01, 0.55, 0.05)  # concrete parapet gray
    uv_dark  = (0.60, 0.15, 0.70, 0.25)  # dark bitumen roof

    W, D, H = 4.60, 2.05, 2.15
    # 1. Main 5-story panel block
    add_uv_box(bm, uv_layer, 0.0, 0.0, H * 0.5, W, D, H,
               uv_front=uv_front, uv_back=uv_front, uv_left=uv_side, uv_right=uv_side, uv_top=uv_roof, uv_bottom=uv_dark)

    # 2. Raised 3D concrete roof parapet (4 walls around roof perimeter)
    pw, ph = 0.09, 0.11
    add_uv_box(bm, uv_layer, 0.0, -D * 0.5 + pw * 0.5, H + ph * 0.5, W + 0.04, pw, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer, 0.0,  D * 0.5 - pw * 0.5, H + ph * 0.5, W + 0.04, pw, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer, -W * 0.5 + pw * 0.5, 0.0, H + ph * 0.5, pw, D, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer,  W * 0.5 - pw * 0.5, 0.0, H + ph * 0.5, pw, D, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)

    # 3. 3D protruding balconies on front facade (4 columns x 4 upper floors, matching atlas UV positions!)
    balc_u_ranges = [(0.04, 0.15), (0.38, 0.49), (0.555, 0.665), (0.89, 0.99)]
    floor_v_ranges = [(0.59, 0.68), (0.69, 0.78), (0.79, 0.88), (0.89, 0.97)]
    for u0, u1 in balc_u_ranges:
        bx = ((u0 + u1) * 0.5 - 0.5) * W
        bw = (u1 - u0) * W
        for v0, v1 in floor_v_ranges:
            fn0 = (v0 - 0.50) / 0.50
            fn1 = (v1 - 0.50) / 0.50
            bz = ((fn0 + fn1) * 0.5) * H
            bh = (fn1 - fn0) * H
            uv_b = (u0, v0, u1, v1)
            add_uv_box(bm, uv_layer, bx, -D * 0.5 - 0.09, bz, bw, 0.18, bh,
                       uv_front=uv_b, uv_back=uv_conc, uv_left=uv_b, uv_right=uv_b, uv_top=uv_conc, uv_bottom=uv_conc)

    # 4. Two 3D Entrance Porches (Подъезды) with concrete canopies, pillars, and steps
    porch_u_ranges = [(0.19, 0.32), (0.71, 0.83)]
    for u0, u1 in porch_u_ranges:
        px = ((u0 + u1) * 0.5 - 0.5) * W
        pw_p = (u1 - u0) * W
        # Entrance vestibule block
        uv_door = (u0, 0.51, u1, 0.60)
        add_uv_box(bm, uv_layer, px, -D * 0.5 - 0.13, 0.21, pw_p * 0.88, 0.26, 0.42,
                   uv_front=uv_door, uv_back=uv_conc, uv_left=uv_conc, uv_right=uv_conc, uv_top=uv_dark)
        # Protruding concrete canopy roof slab
        add_uv_box(bm, uv_layer, px, -D * 0.5 - 0.17, 0.43, pw_p * 1.05, 0.34, 0.05,
                   uv_front=uv_conc, uv_back=uv_conc, uv_left=uv_conc, uv_right=uv_conc, uv_top=uv_dark)
        # Concrete steps pad
        add_uv_box(bm, uv_layer, px, -D * 0.5 - 0.20, 0.04, pw_p * 0.96, 0.40, 0.08,
                   uv_front=uv_conc, uv_back=uv_conc, uv_left=uv_conc, uv_right=uv_conc, uv_top=uv_conc)

    # 5. 3D Rooftop Ventilation Shafts & Roof Hatch House
    vent_positions = [(-1.55, -0.35, 0.26, 0.22, 0.26), (-1.10, -0.35, 0.26, 0.22, 0.26),
                      (-0.75, 0.38, 0.42, 0.32, 0.34), (0.15, 0.28, 0.52, 0.42, 0.30),
                      (0.85, -0.32, 0.26, 0.22, 0.26), (1.35, -0.32, 0.26, 0.22, 0.26),
                      (1.48, 0.35, 0.40, 0.30, 0.32)]
    for vx, vy, vw, vd, vh in vent_positions:
        add_uv_box(bm, uv_layer, vx, vy, H + vh * 0.5, vw, vd, vh,
                   uv_front=uv_conc, uv_back=uv_conc, uv_left=uv_conc, uv_right=uv_conc, uv_top=uv_dark)
        # Vent cap slab
        add_uv_box(bm, uv_layer, vx, vy, H + vh + 0.02, vw + 0.05, vd + 0.05, 0.04,
                   uv_front=uv_dark, uv_back=uv_dark, uv_left=uv_dark, uv_right=uv_dark, uv_top=uv_dark)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    mat = create_pbr_material("building_khrushchevka_mat", "blender_assets/cat3_concepts/building_khrushchevka_atlas.png")
    obj.data.materials.append(mat)
    export_and_preview(obj, "assets/models/building_khrushchevka.glb", target_span=4.8)

def build_military_hq():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mesh = bpy.data.meshes.new("building_military_hq_mesh")
    obj = bpy.data.objects.new("building_military_hq", mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")

    uv_front = (0.01, 0.51, 0.99, 0.99)
    uv_side  = (0.02, 0.02, 0.48, 0.48)
    uv_roof  = (0.53, 0.03, 0.97, 0.47)
    uv_conc  = (0.51, 0.01, 0.55, 0.05)
    uv_dark  = (0.60, 0.15, 0.70, 0.25)
    uv_sand  = (0.02, 0.52, 0.16, 0.65)  # sandbag texture region on front facade
    uv_camo  = (0.36, 0.08, 0.48, 0.38)  # olive military equipment / camo region

    W, D, H = 4.60, 2.15, 1.52
    # 1. Main reinforced concrete command bunker block
    add_uv_box(bm, uv_layer, 0.0, 0.0, H * 0.5, W, D, H,
               uv_front=uv_front, uv_back=uv_front, uv_left=uv_side, uv_right=uv_side, uv_top=uv_roof, uv_bottom=uv_dark)

    # 2. Heavy armored concrete upper cornice & roof parapet
    add_uv_box(bm, uv_layer, 0.0, 0.0, H - 0.08, W + 0.08, D + 0.08, 0.18,
               uv_front=(0.01, 0.88, 0.99, 0.99), uv_back=(0.01, 0.88, 0.99, 0.99),
               uv_left=(0.02, 0.40, 0.48, 0.48), uv_right=(0.02, 0.40, 0.48, 0.48), uv_top=uv_roof)

    pw, ph = 0.12, 0.12
    add_uv_box(bm, uv_layer, 0.0, -D * 0.5 + pw * 0.5, H + ph * 0.5, W + 0.04, pw, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer, 0.0,  D * 0.5 - pw * 0.5, H + ph * 0.5, W + 0.04, pw, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer, -W * 0.5 + pw * 0.5, 0.0, H + ph * 0.5, pw, D, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer,  W * 0.5 - pw * 0.5, 0.0, H + ph * 0.5, pw, D, ph, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)

    # 3. Protruding Blast Door Portal & 3D Stacked Sandbag Barricades along Front Facade
    # Blast door portal in atlas is at u = 0.185..0.355 -> x = -1.06
    portal_x = -1.06
    add_uv_box(bm, uv_layer, portal_x, -D * 0.5 - 0.07, 0.48, 0.76, 0.14, 0.96,
               uv_front=(0.185, 0.52, 0.355, 0.88), uv_back=uv_conc, uv_left=uv_conc, uv_right=uv_conc, uv_top=uv_conc)

    # Left & Right 3D Sandbag Walls flanking the blast door (u=0.01..0.17 and u=0.36..0.54)
    for sbx, sbw in [(-1.86, 0.74), (-0.18, 0.84)]:
        add_uv_box(bm, uv_layer, sbx, -D * 0.5 - 0.13, 0.20, sbw, 0.26, 0.40,
                   uv_front=uv_sand, uv_back=uv_sand, uv_left=uv_sand, uv_right=uv_sand, uv_top=uv_sand)
        add_uv_box(bm, uv_layer, sbx, -D * 0.5 - 0.10, 0.44, sbw * 0.86, 0.20, 0.12,
                   uv_front=uv_sand, uv_back=uv_sand, uv_left=uv_sand, uv_right=uv_sand, uv_top=uv_sand)

    # 4. 3D Armored Generator / Filtration Units on the right half of Front & Side Walls
    for gx in [1.18, 1.84]:
        add_uv_box(bm, uv_layer, gx, -D * 0.5 - 0.10, 0.45, 0.44, 0.20, 0.88,
                   uv_front=uv_camo, uv_back=uv_camo, uv_left=uv_camo, uv_right=uv_camo, uv_top=uv_conc)

    # 5. Rooftop Concrete Vent Blocks, Camouflaged Crate Stack, Parabolic Radar Dish & Radio Mast
    add_uv_box(bm, uv_layer, -1.35, -0.25, H + 0.18, 0.38, 0.38, 0.36, uv_conc, uv_conc, uv_conc, uv_conc, uv_dark)
    add_uv_box(bm, uv_layer,  0.15, -0.35, H + 0.18, 0.38, 0.38, 0.36, uv_conc, uv_conc, uv_conc, uv_conc, uv_dark)
    # Camouflaged crate stack on right side of roof
    add_uv_box(bm, uv_layer,  1.25,  0.22, H + 0.22, 0.95, 0.68, 0.44, uv_camo, uv_camo, uv_camo, uv_camo, uv_camo)

    # 3D Parabolic Radar Dish on roof pedestal (at x=-0.25, y=0.32)
    rx, ry = -0.25, 0.32
    add_uv_box(bm, uv_layer, rx, ry, H + 0.18, 0.28, 0.28, 0.36, uv_camo, uv_camo, uv_camo, uv_camo, uv_camo)
    # Build sunlit olive-steel radar dish assembly + central feed horn
    dish_verts = []
    segs = 16
    rad = 0.44
    tilt = math.radians(32)
    dcx, dcy, dcz = rx, ry - 0.06, H + 0.56
    v_center = bm.verts.new((dcx, dcy + 0.08, dcz - 0.04))
    v_center_back = bm.verts.new((dcx, dcy + 0.14, dcz - 0.07))
    for i in range(segs):
        ang = (i / float(segs)) * math.pi * 2.0
        lx = math.cos(ang) * rad
        lz = math.sin(ang) * rad
        wy = -lz * math.sin(tilt)
        wz =  lz * math.cos(tilt)
        vx = dcx + lx * 0.94 - wy * 0.20
        vy = dcy + wy
        vz = dcz + wz
        dish_verts.append((bm.verts.new((vx, vy, vz)), lx / rad, lz / rad))
    for i in range(segs):
        va, uxa, uza = dish_verts[i]
        vb, uxb, uzb = dish_verts[(i + 1) % segs]
        # Front concave face pointing toward camera (-Y/+Z)
        f1 = bm.faces.new([v_center, vb, va])
        f2 = bm.faces.new([v_center_back, va, vb])
        for f in (f1, f2):
            for loop, (ux, uz) in zip(f.loops, [(0.0, 0.0), (uxb, uzb), (uxa, uza)]):
                loop[uv_layer].uv = (0.08 + (ux + 1.0) * 0.06, 0.55 + (uz + 1.0) * 0.06)
    # Radar feed horn strut in front of dish
    add_uv_box(bm, uv_layer, dcx, dcy - 0.16, dcz + 0.06, 0.06, 0.28, 0.06, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)

    # Multi-tier Yagi Military Radio Antenna Mast (x = 0.55, y = 0.35)
    add_uv_box(bm, uv_layer, 0.55, 0.35, H + 0.56, 0.05, 0.05, 1.12, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer, 0.55, 0.35, H + 0.62, 0.54, 0.04, 0.04, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer, 0.55, 0.35, H + 0.84, 0.38, 0.04, 0.04, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)
    add_uv_box(bm, uv_layer, 0.55, 0.35, H + 1.02, 0.24, 0.03, 0.03, uv_conc, uv_conc, uv_conc, uv_conc, uv_conc)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    mat = create_pbr_material("building_military_hq_mat", "blender_assets/cat3_concepts/building_military_hq_atlas.png")
    obj.data.materials.append(mat)
    export_and_preview(obj, "assets/models/building_military_hq.glb", target_span=4.8)

if __name__ == '__main__':
    build_khrushchevka()
    build_military_hq()
