import bpy
import bmesh
import math
import os
from mathutils import Matrix, Vector

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import original Vasily
bpy.ops.import_scene.gltf(filepath='blender_assets/vasiliy_generated.glb')
model = bpy.data.objects['model']
model.name = 'Vasiliy_Body'
camo_mat = model.material_slots[0].material if model.material_slots else None

# Align feet to Z=0
min_z = min(v.co.z for v in model.data.vertices)
for v in model.data.vertices:
    v.co.z -= min_z

bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 2. Cleanly remove dangling lower arms outside hip contour (abs(X) > 0.19, 0.65 < Z < 1.28)
# Preserves the full broad shoulder width (Z > 1.28)
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(model.data)
verts_to_delete = [v for v in bm.verts if abs(v.co.x) > 0.19 and 0.65 < v.co.z < 1.28]
bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')
bmesh.update_edit_mesh(model.data)
bpy.ops.object.mode_set(mode='OBJECT')

# 3. Flank Patches to close hip/waist openings smoothly
bpy.ops.mesh.primitive_cylinder_add(radius=0.185, depth=0.55, location=(-0.17, -0.01, 0.98))
r_patch = bpy.context.active_object
r_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: r_patch.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.185, depth=0.55, location=(0.17, -0.01, 0.98))
l_patch = bpy.context.active_object
l_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: l_patch.data.materials.append(camo_mat)

# Glove Material (heavy dark winter leather)
glove_mat = bpy.data.materials.new(name='GloveMat')
glove_mat.use_nodes = True
bsdf_g = glove_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_g:
    bsdf_g.inputs['Base Color'].default_value = (0.12, 0.12, 0.14, 1.0)
    bsdf_g.inputs['Roughness'].default_value = 0.85

def create_thick_limb(p1, p2, r1, r2, mat, name='Limb'):
    p1 = Vector(p1)
    p2 = Vector(p2)
    dir_vec = p2 - p1
    length = dir_vec.length
    mid = (p1 + p2) / 2.0
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=length, location=mid)
    obj = bpy.context.active_object
    obj.name = name
    up = Vector((0, 0, 1))
    rot_quat = up.rotation_difference(dir_vec)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = rot_quat
    if mat: obj.data.materials.append(mat)
    return obj

# 4. BROAD, BULKY WINTER SLEEVES WITH PROPER GRIP REACH
# Weapon Grip is at (-0.09, -0.36, 1.22)
# Weapon Fore-end is at (-0.06, -0.58, 1.22)

# Right Shoulder at (-0.26, -0.02, 1.36)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.125, location=(-0.26, -0.02, 1.36))
r_sh = bpy.context.active_object
if camo_mat: r_sh.data.materials.append(camo_mat)

# Right Upper Arm: shoulder (-0.26, -0.02, 1.36) -> elbow (-0.22, -0.16, 1.20)
r_up = create_thick_limb((-0.26, -0.02, 1.36), (-0.22, -0.16, 1.20), 0.115, 0.10, camo_mat, 'R_Upper')

# Right Elbow Joint
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.10, location=(-0.22, -0.16, 1.20))
r_elb = bpy.context.active_object
if camo_mat: r_elb.data.materials.append(camo_mat)

# Right Forearm: elbow (-0.22, -0.16, 1.20) -> wrist (-0.09, -0.36, 1.22)
r_fore = create_thick_limb((-0.22, -0.16, 1.20), (-0.09, -0.36, 1.22), 0.098, 0.088, camo_mat, 'R_Forearm')

# Right Mitten gripping trigger at (-0.09, -0.36, 1.22)
bpy.ops.mesh.primitive_cube_add(size=0.11, location=(-0.09, -0.36, 1.22))
r_hand = bpy.context.active_object
r_hand.scale = (0.85, 1.3, 0.95)
r_hand.data.materials.append(glove_mat)

# Left Shoulder at (0.26, -0.02, 1.36)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.125, location=(0.26, -0.02, 1.36))
l_sh = bpy.context.active_object
if camo_mat: l_sh.data.materials.append(camo_mat)

# Left Upper Arm: shoulder (0.26, -0.02, 1.36) -> elbow (0.20, -0.26, 1.18)
l_up = create_thick_limb((0.26, -0.02, 1.36), (0.20, -0.26, 1.18), 0.115, 0.10, camo_mat, 'L_Upper')

# Left Elbow Joint
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.10, location=(0.20, -0.26, 1.18))
l_elb = bpy.context.active_object
if camo_mat: l_elb.data.materials.append(camo_mat)

# Left Forearm: elbow (0.20, -0.26, 1.18) -> wrist (-0.06, -0.58, 1.20)
# Reaches across and forward to support the fore-end
l_fore = create_thick_limb((0.20, -0.26, 1.18), (-0.06, -0.58, 1.20), 0.098, 0.088, camo_mat, 'L_Forearm')

# Left Mitten cupping fore-end at (-0.06, -0.58, 1.20)
bpy.ops.mesh.primitive_cube_add(size=0.11, location=(-0.06, -0.58, 1.20))
l_hand = bpy.context.active_object
l_hand.scale = (0.95, 1.4, 0.75)
l_hand.data.materials.append(glove_mat)

# Join all arm parts into Vasiliy_Body
arm_parts = [r_patch, l_patch, r_sh, r_up, r_elb, r_fore, r_hand, l_sh, l_up, l_elb, l_fore, l_hand]
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
for p in arm_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.join()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -------------------------------------------------------------
# 5. DETAILED DIESELPUNK WEAPONS
# -------------------------------------------------------------

# Shared Materials
steel_mat = bpy.data.materials.new(name='Diesel_Steel')
steel_mat.use_nodes = True
bsdf = steel_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.22, 0.24, 0.26, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.95
    bsdf.inputs['Roughness'].default_value = 0.32

wood_mat = bpy.data.materials.new(name='Birch_Wood')
wood_mat.use_nodes = True
bsdf = wood_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.36, 0.17, 0.06, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.65

brass_mat = bpy.data.materials.new(name='Soviet_Brass')
brass_mat.use_nodes = True
bsdf = brass_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.75, 0.58, 0.22, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.90
    bsdf.inputs['Roughness'].default_value = 0.35

orange_mat = bpy.data.materials.new(name='Industrial_Orange')
orange_mat.use_nodes = True
bsdf = orange_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.85, 0.38, 0.08, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.45
    bsdf.inputs['Metallic'].default_value = 0.30

glow_plasma_mat = bpy.data.materials.new(name='Plasma_Glow')
glow_plasma_mat.use_nodes = True
bsdf = glow_plasma_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.1, 0.9, 0.7, 1.0)
    bsdf.inputs['Emission Color'].default_value = (0.1, 1.0, 0.7, 1.0)
    bsdf.inputs['Emission Strength'].default_value = 4.0

# -----------------
# A. ОБРЕЗ ДВУСТВОЛКИ (Vasiliy_Shotgun — Real 360 3D GLB Mesh)
# -----------------
shotgun_glb_path = os.path.abspath('assets/models/weapon_shotgun.glb')
if os.path.exists(shotgun_glb_path):
    before_objs = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=shotgun_glb_path)
    imported_objs = [o for o in bpy.context.scene.objects if o not in before_objs]
    sg_meshes = [o for o in imported_objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for m in sg_meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = sg_meshes[0]
    if len(sg_meshes) > 1:
        bpy.ops.object.join()
    shotgun_obj = bpy.context.active_object
    shotgun_obj.name = 'Vasiliy_Shotgun'
    if shotgun_obj.parent:
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for o in imported_objs:
        if o != shotgun_obj and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)

    shotgun_obj.rotation_mode = 'XYZ'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # In weapon_shotgun.glb, stock is at -X and muzzle is at +X; rotate -90 deg Z so muzzle points to -Y
    shotgun_obj.rotation_euler = (0, 0, math.radians(-90))
    bpy.ops.object.transform_apply(rotation=True)

    verts = [v.co for v in shotgun_obj.data.vertices]
    dy = max(v.y for v in verts) - min(v.y for v in verts)
    scale_sg = 0.88 / max(dy, 1e-4)
    shotgun_obj.scale = (scale_sg, scale_sg, scale_sg)
    bpy.ops.object.transform_apply(scale=True)

    verts = [v.co for v in shotgun_obj.data.vertices]
    cx = (min(v.x for v in verts) + max(v.x for v in verts)) * 0.5
    max_y = max(v.y for v in verts)
    min_z = min(v.z for v in verts)
    for v in shotgun_obj.data.vertices:
        v.co.x = (v.co.x - cx) - 0.068
        v.co.y = (v.co.y - max_y) - 0.19
        v.co.z = (v.co.z - min_z) + 1.12
    shotgun_obj.data.update()
else:
    bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.08, -0.22, 1.25))
    s_stock = bpy.context.active_object
    s_stock.scale = (0.55, 2.4, 1.2)
    s_stock.rotation_euler = (math.radians(-5), 0, 0)
    s_stock.data.materials.append(wood_mat)

    bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.07, -0.42, 1.24))
    s_rec = bpy.context.active_object
    s_rec.scale = (0.75, 1.8, 1.1)
    s_rec.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.065, -0.58, 1.22))
    s_fore = bpy.context.active_object
    s_fore.scale = (0.80, 2.2, 0.75)
    s_fore.data.materials.append(wood_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.62, location=(-0.09, -0.78, 1.25))
    s_b1 = bpy.context.active_object
    s_b1.rotation_euler = (math.radians(90), 0, 0)
    s_b1.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.62, location=(-0.04, -0.78, 1.25))
    s_b2 = bpy.context.active_object
    s_b2.rotation_euler = (math.radians(90), 0, 0)
    s_b2.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=(-0.065, -1.07, 1.275))
    s_sight = bpy.context.active_object
    s_sight.data.materials.append(brass_mat)

    bpy.ops.object.select_all(action='DESELECT')
    for p in [s_stock, s_rec, s_fore, s_b1, s_b2, s_sight]: p.select_set(True)
    bpy.context.view_layer.objects.active = s_stock
    bpy.ops.object.join()
    shotgun_obj = bpy.context.active_object
    shotgun_obj.name = 'Vasiliy_Shotgun'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -----------------
# B. ПЕРФОРАТОР / БУР (Vasiliy_Drill — Real 360 3D GLB Mesh)
# -----------------
drill_glb_path = os.path.abspath('assets/models/weapon_drill.glb')
if os.path.exists(drill_glb_path):
    before_objs = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=drill_glb_path)
    imported_objs = [o for o in bpy.context.scene.objects if o not in before_objs]
    dr_meshes = [o for o in imported_objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for m in dr_meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = dr_meshes[0]
    if len(dr_meshes) > 1:
        bpy.ops.object.join()
    drill_obj = bpy.context.active_object
    drill_obj.name = 'Vasiliy_Drill'
    if drill_obj.parent:
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for o in imported_objs:
        if o != drill_obj and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)

    drill_obj.rotation_mode = 'XYZ'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # In weapon_drill.glb, rear handle is at -X and auger bit points to +X; rotate -90 deg Z so auger points to -Y
    drill_obj.rotation_euler = (0, 0, math.radians(-90))
    bpy.ops.object.transform_apply(rotation=True)

    verts = [v.co for v in drill_obj.data.vertices]
    dy = max(v.y for v in verts) - min(v.y for v in verts)
    scale_dr = 0.96 / max(dy, 1e-4)
    drill_obj.scale = (scale_dr, scale_dr, scale_dr)
    bpy.ops.object.transform_apply(scale=True)

    verts = [v.co for v in drill_obj.data.vertices]
    cx = (min(v.x for v in verts) + max(v.x for v in verts)) * 0.5
    max_y = max(v.y for v in verts)
    min_z = min(v.z for v in verts)
    for v in drill_obj.data.vertices:
        v.co.x = (v.co.x - cx) - 0.068
        v.co.y = (v.co.y - max_y) - 0.20
        v.co.z = (v.co.z - min_z) + 1.10
    drill_obj.data.update()
else:
    bpy.ops.mesh.primitive_cube_add(size=0.18, location=(-0.07, -0.42, 1.24))
    d_body = bpy.context.active_object
    d_body.scale = (1.0, 1.6, 1.2)
    d_body.data.materials.append(orange_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=0.22, location=(-0.07, -0.38, 1.32))
    d_vent = bpy.context.active_object
    d_vent.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cube_add(size=0.09, location=(-0.08, -0.28, 1.22))
    d_h1 = bpy.context.active_object
    d_h1.scale = (0.6, 1.4, 1.2)
    d_h1.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=0.18, location=(-0.06, -0.56, 1.22))
    d_h2 = bpy.context.active_object
    d_h2.rotation_euler = (0, math.radians(90), 0)
    d_h2.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.065, depth=0.16, location=(-0.065, -0.62, 1.24))
    d_chuck = bpy.context.active_object
    d_chuck.rotation_euler = (math.radians(90), 0, 0)
    d_chuck.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cone_add(radius1=0.07, radius2=0.02, depth=0.48, location=(-0.065, -0.88, 1.24))
    d_bit = bpy.context.active_object
    d_bit.rotation_euler = (math.radians(-90), 0, 0)
    d_bit.data.materials.append(steel_mat)

    spiral_rings = []
    for i in range(4):
        y_pos = -0.72 - i * 0.09
        r_pos = 0.065 - i * 0.009
        bpy.ops.mesh.primitive_torus_add(major_radius=r_pos, minor_radius=0.015, location=(-0.065, y_pos, 1.24))
        ring = bpy.context.active_object
        ring.rotation_euler = (math.radians(72), math.radians(25), 0)
        ring.data.materials.append(steel_mat)
        spiral_rings.append(ring)

    bpy.ops.mesh.primitive_cube_add(size=0.035, location=(-0.065, -1.13, 1.24))
    d_tip = bpy.context.active_object
    d_tip.scale = (1.4, 0.4, 1.4)
    d_tip.data.materials.append(brass_mat)

    bpy.ops.object.select_all(action='DESELECT')
    for p in [d_body, d_vent, d_h1, d_h2, d_chuck, d_bit, d_tip] + spiral_rings: p.select_set(True)
    bpy.context.view_layer.objects.active = d_body
    bpy.ops.object.join()
    drill_obj = bpy.context.active_object
    drill_obj.name = 'Vasiliy_Drill'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -----------------
# C. КУСТАРНЫЙ ПЛАЗМОМЁТ (Vasiliy_Plasma — Real 360 3D GLB Mesh)
# -----------------
plasma_glb_path = os.path.abspath('assets/models/weapon_plasma.glb')
if os.path.exists(plasma_glb_path):
    before_objs = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=plasma_glb_path)
    imported_objs = [o for o in bpy.context.scene.objects if o not in before_objs]
    pl_meshes = [o for o in imported_objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for m in pl_meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = pl_meshes[0]
    if len(pl_meshes) > 1:
        bpy.ops.object.join()
    plasma_obj = bpy.context.active_object
    plasma_obj.name = 'Vasiliy_Plasma'
    if plasma_obj.parent:
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for o in imported_objs:
        if o != plasma_obj and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)

    plasma_obj.rotation_mode = 'XYZ'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # In weapon_plasma.glb, stock is at -X and muzzle is at +X; rotate -90 deg Z so muzzle points to -Y
    plasma_obj.rotation_euler = (0, 0, math.radians(-90))
    bpy.ops.object.transform_apply(rotation=True)

    verts = [v.co for v in plasma_obj.data.vertices]
    dy = max(v.y for v in verts) - min(v.y for v in verts)
    scale_pl = 0.96 / max(dy, 1e-4)
    plasma_obj.scale = (scale_pl, scale_pl, scale_pl)
    bpy.ops.object.transform_apply(scale=True)

    verts = [v.co for v in plasma_obj.data.vertices]
    cx = (min(v.x for v in verts) + max(v.x for v in verts)) * 0.5
    max_y = max(v.y for v in verts)
    min_z = min(v.z for v in verts)
    for v in plasma_obj.data.vertices:
        v.co.x = (v.co.x - cx) - 0.068
        v.co.y = (v.co.y - max_y) - 0.18
        v.co.z = (v.co.z - min_z) + 1.11
    plasma_obj.data.update()
else:
    bpy.ops.mesh.primitive_cube_add(size=0.15, location=(-0.07, -0.42, 1.24))
    p_frame = bpy.context.active_object
    p_frame.scale = (0.9, 2.0, 1.1)
    p_frame.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cube_add(size=0.12, location=(-0.08, -0.26, 1.26))
    p_bat = bpy.context.active_object
    p_bat.scale = (0.8, 1.5, 1.2)
    p_bat.data.materials.append(steel_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.052, depth=0.24, location=(-0.065, -0.52, 1.25))
    p_core = bpy.context.active_object
    p_core.rotation_euler = (math.radians(90), 0, 0)
    p_core.data.materials.append(glow_plasma_mat)

    rails = []
    rail_offsets = [(-0.035, 0.035), (0.035, 0.035), (-0.035, -0.035), (0.035, -0.035)]
    for dx, dz in rail_offsets:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.48, location=(-0.065 + dx, -0.84, 1.24 + dz))
        r = bpy.context.active_object
        r.rotation_euler = (math.radians(90), 0, 0)
        r.data.materials.append(brass_mat)
        rails.append(r)

    insulators = []
    for y_pos in [-0.70, -0.88, -1.04]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.055, minor_radius=0.012, location=(-0.065, y_pos, 1.24))
        ins = bpy.context.active_object
        ins.rotation_euler = (math.radians(90), 0, 0)
        ins.data.materials.append(steel_mat)
        insulators.append(ins)

    bpy.ops.mesh.primitive_cone_add(radius1=0.025, radius2=0.005, depth=0.08, location=(-0.065, -1.10, 1.24))
    p_tip = bpy.context.active_object
    p_tip.rotation_euler = (math.radians(-90), 0, 0)
    p_tip.data.materials.append(glow_plasma_mat)

    bpy.ops.object.select_all(action='DESELECT')
    for p in [p_frame, p_bat, p_core, p_tip] + rails + insulators: p.select_set(True)
    bpy.context.view_layer.objects.active = p_frame
    bpy.ops.object.join()
    plasma_obj = bpy.context.active_object
    plasma_obj.name = 'Vasiliy_Plasma'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -----------------
# 6. Armature Rig & Clean Parenting
# -----------------
arm_data = bpy.data.armatures.new('Vasiliy_Armature')
rig = bpy.data.objects.new('Vasiliy_Rig', arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = rig.data.edit_bones

root = eb.new('Root'); root.head = (0, 0, 0); root.tail = (0, 0, 0.2)
pelvis = eb.new('Pelvis'); pelvis.head = (0, 0, 0.95); pelvis.tail = (0, 0, 1.15); pelvis.parent = root
spine = eb.new('Spine'); spine.head = (0, 0, 1.15); spine.tail = (0, 0, 1.35); spine.parent = pelvis
chest = eb.new('Chest'); chest.head = (0, 0, 1.35); chest.tail = (0, 0, 1.55); chest.parent = spine
head = eb.new('Head'); head.head = (0, 0, 1.55); head.tail = (0, 0, 1.95); head.parent = chest

# Legs (Knee placed at Z=0.44 below winter coat hem so knee bend is 100% visible!)
thigh_l = eb.new('Thigh.L'); thigh_l.head = (0.15, 0, 0.86); thigh_l.tail = (0.15, 0, 0.44); thigh_l.parent = pelvis
shin_l = eb.new('Shin.L'); shin_l.head = (0.15, 0, 0.44); shin_l.tail = (0.15, 0, 0.11); shin_l.parent = thigh_l
foot_l = eb.new('Foot.L'); foot_l.head = (0.15, 0, 0.11); foot_l.tail = (0.15, -0.22, 0.02); foot_l.parent = shin_l

thigh_r = eb.new('Thigh.R'); thigh_r.head = (-0.15, 0, 0.86); thigh_r.tail = (-0.15, 0, 0.44); thigh_r.parent = pelvis
shin_r = eb.new('Shin.R'); shin_r.head = (-0.15, 0, 0.44); shin_r.tail = (-0.15, 0, 0.11); shin_r.parent = thigh_r
foot_r = eb.new('Foot.R'); foot_r.head = (-0.15, 0, 0.11); foot_r.tail = (-0.15, -0.22, 0.02); foot_r.parent = shin_r

# Weapon socket bone right at grip location, child of Chest
weapon_socket = eb.new('Weapon_Socket')
weapon_socket.head = (-0.07, -0.36, 1.22)
weapon_socket.tail = (-0.07, -0.76, 1.22)
weapon_socket.parent = chest

bpy.ops.object.mode_set(mode='OBJECT')

for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'

# Armature modifier for Body
mod = model.modifiers.new(name='Armature', type='ARMATURE')
mod.object = rig
model.parent = rig

# Bone parent all 3 weapons to Weapon_Socket keeping world transforms!
for w_obj in [shotgun_obj, drill_obj, plasma_obj]:
    bpy.ops.object.select_all(action='DESELECT')
    w_obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    rig.data.bones.active = rig.data.bones['Weapon_Socket']
    bpy.ops.object.parent_set(type='BONE')
    bpy.ops.object.mode_set(mode='OBJECT')

# 7. Smooth Biomechanical Skinning Weights
model.vertex_groups.clear()
vg_head = model.vertex_groups.new(name='Head')
vg_chest = model.vertex_groups.new(name='Chest')
vg_spine = model.vertex_groups.new(name='Spine')
vg_pelvis = model.vertex_groups.new(name='Pelvis')
vg_thigh_l = model.vertex_groups.new(name='Thigh.L')
vg_shin_l = model.vertex_groups.new(name='Shin.L')
vg_foot_l = model.vertex_groups.new(name='Foot.L')
vg_thigh_r = model.vertex_groups.new(name='Thigh.R')
vg_shin_r = model.vertex_groups.new(name='Shin.R')
vg_foot_r = model.vertex_groups.new(name='Foot.R')

def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

for v in model.data.vertices:
    x, y, z = v.co
    idx = v.index

    # Arms/sleeves/gloves (above waist z > 1.15 and forward/outward) stay locked to Chest
    is_arm_or_hand = (z > 1.15 and (y < -0.14 or abs(x) > 0.23))
    if is_arm_or_hand:
        vg_chest.add([idx], 1.0, 'REPLACE')
        continue

    if z >= 1.56:
        w_head = smoothstep(1.56, 1.65, z)
        if w_head > 0.001: vg_head.add([idx], w_head, 'REPLACE')
        if 1.0 - w_head > 0.001: vg_chest.add([idx], 1.0 - w_head, 'REPLACE')
    elif z >= 1.28:
        w_chest = smoothstep(1.28, 1.38, z)
        if w_chest > 0.001: vg_chest.add([idx], w_chest, 'REPLACE')
        if 1.0 - w_chest > 0.001: vg_spine.add([idx], 1.0 - w_chest, 'REPLACE')
    elif z >= 1.06:
        w_spine = smoothstep(1.06, 1.18, z)
        if w_spine > 0.001: vg_spine.add([idx], w_spine, 'REPLACE')
        if 1.0 - w_spine > 0.001: vg_pelvis.add([idx], 1.0 - w_spine, 'REPLACE')
    else:
        # Lower body: allow full thigh movement up to z=0.88 so the whole leg strides cleanly
        w_pelvis = smoothstep(0.82, 0.94, z)
        w_leg = 1.0 - w_pelvis
        if w_pelvis > 0.001:
            vg_pelvis.add([idx], w_pelvis, 'REPLACE')

        if w_leg > 0.001:
            side_l = smoothstep(-0.035, 0.035, x)
            side_r = 1.0 - side_l

            # Knee joint is at z=0.44; ankle joint is at z=0.11
            w_thigh = smoothstep(0.38, 0.50, z)
            w_below_knee = 1.0 - w_thigh
            w_shin = w_below_knee * smoothstep(0.07, 0.14, z)
            w_foot = w_below_knee * (1.0 - smoothstep(0.07, 0.14, z))

            for side_w, vg_t, vg_s, vg_f in [
                (side_l, vg_thigh_l, vg_shin_l, vg_foot_l),
                (side_r, vg_thigh_r, vg_shin_r, vg_foot_r)
            ]:
                if side_w > 0.001:
                    if w_thigh > 0.001: vg_t.add([idx], w_leg * side_w * w_thigh, 'REPLACE')
                    if w_shin > 0.001:  vg_s.add([idx], w_leg * side_w * w_shin, 'REPLACE')
                    if w_foot > 0.001:  vg_f.add([idx], w_leg * side_w * w_foot, 'REPLACE')

# 8. Helper to reset pose
rig.animation_data_create()
bpy.ops.object.mode_set(mode='POSE')

def reset_pose():
    for b in rig.pose.bones:
        b.rotation_mode = 'XYZ'
        b.location = (0, 0, 0)
        b.rotation_euler = (0, 0, 0)
        b.scale = (1, 1, 1)

def keyframe_all(frame):
    for b in rig.pose.bones:
        b.keyframe_insert(data_path='location', frame=frame)
        b.keyframe_insert(data_path='rotation_euler', frame=frame)

# ==============================================================================
# ACTION 1: Vasiliy_Walk (8-Pose Classical Biomechanical Walk Cycle)
# Note: Shin is a child of Thigh!
# When Thigh lifts forward (-0.65 rad), Shin MUST bend locally by +1.25 rad
# so that in world space the lower leg angles sharply backward (+0.60 rad)
# and the knee joint visibly bends!
# ==============================================================================
act_walk = bpy.data.actions.new(name='Vasiliy_Walk')
rig.animation_data.action = act_walk

# 8 key poses over u in [0..1): (thigh_x, shin_x, foot_x)
# u=0.00: Contact (front heel strike)
# u=0.125: Down (knee absorbs impact)
# u=0.25: Mid-Stance (planted leg passes under hip)
# u=0.375: Push-Off (back leg extends behind body)
# u=0.50: Toe-Off (knee bends sharply backward to lift boot off ground)
# u=0.625: Initial Swing (heel tucked high behind knee: shin = +1.30 rad!)
# u=0.75: High-Knee Passing (thigh lifted high forward -0.68 rad while shin bent +1.15 rad!)
# u=0.875: Reach (thigh forward -0.60 rad, shin kicking forward +0.45 rad before heel strike)
WALK_KEYS = [
    (-0.52,  0.12,  0.32),  # 0: Contact (front)
    (-0.34,  0.42,  0.04),  # 1: Down (cushion)
    ( 0.04,  0.08, -0.04),  # 2: Mid-stance
    ( 0.36,  0.14, -0.22),  # 3: Pre-push-off
    ( 0.48,  0.55, -0.30),  # 4: Toe-off (back)
    ( 0.12,  1.32,  0.05),  # 5: Swing lift (sharp knee bend!)
    (-0.68,  1.18,  0.22),  # 6: High-knee passing (knee leads forward, shin tucked back!)
    (-0.60,  0.48,  0.28),  # 7: Forward reach
]

def sample_walk_curve(u):
    u = u % 1.0
    pos = u * 8.0
    i0 = int(math.floor(pos)) % 8
    i1 = (i0 + 1) % 8
    frac = pos - math.floor(pos)
    # Cosine smooth interpolation
    mu = (1.0 - math.cos(frac * math.pi)) * 0.5
    p0 = WALK_KEYS[i0]
    p1 = WALK_KEYS[i1]
    return (
        p0[0] + (p1[0] - p0[0]) * mu,
        p0[1] + (p1[1] - p0[1]) * mu,
        p0[2] + (p1[2] - p0[2]) * mu,
    )

for frame in range(1, 18):
    bpy.context.scene.frame_set(frame)
    reset_pose()
    u = ((frame - 1) % 16) / 16.0
    phase = u * math.pi * 2.0

    tl_x, sl_x, fl_x = sample_walk_curve(u)
    tr_x, sr_x, fr_x = sample_walk_curve(u + 0.5)

    rig.pose.bones['Thigh.L'].rotation_euler = (tl_x, 0, 0)
    rig.pose.bones['Shin.L'].rotation_euler = (sl_x, 0, 0)
    rig.pose.bones['Foot.L'].rotation_euler = (fl_x, 0, 0)

    rig.pose.bones['Thigh.R'].rotation_euler = (tr_x, 0, 0)
    rig.pose.bones['Shin.R'].rotation_euler = (sr_x, 0, 0)
    rig.pose.bones['Foot.R'].rotation_euler = (fr_x, 0, 0)

    # Natural double-frequency vertical gait bob (low at contact u=0,0.5; high at passing u=0.25,0.75)
    bounce_z = -0.025 * math.cos(phase * 2.0) - 0.015
    rig.pose.bones['Pelvis'].location = (0, 0, bounce_z)
    rig.pose.bones['Pelvis'].rotation_euler = (math.radians(3.0), math.sin(phase) * 0.04, -math.cos(phase) * 0.07)

    # Upper body slight forward combat lean (+X curls forward!) & counter-twist
    rig.pose.bones['Spine'].rotation_euler = (math.radians(4.0), 0, math.cos(phase) * 0.035)
    rig.pose.bones['Chest'].rotation_euler = (math.radians(3.0), 0, math.cos(phase) * 0.04)
    rig.pose.bones['Head'].rotation_euler = (-math.radians(4.0), 0, -math.cos(phase) * 0.02)

    keyframe_all(frame)

track_walk = rig.animation_data.nla_tracks.new()
track_walk.name = 'Vasiliy_Walk'
strip_walk = track_walk.strips.new('Vasiliy_Walk', 1, act_walk)

# ==============================================================================
# ACTION 2: Vasiliy_Idle (Grounded combat stance with subtle breathing)
# ==============================================================================
act_idle = bpy.data.actions.new(name='Vasiliy_Idle')
rig.animation_data.action = act_idle

for frame in range(1, 18):
    bpy.context.scene.frame_set(frame)
    reset_pose()
    phase = (((frame - 1) % 16) / 16.0) * math.pi * 2.0
    breath = math.sin(phase)

    rig.pose.bones['Thigh.L'].rotation_euler = (-0.08, 0, 0)
    rig.pose.bones['Shin.L'].rotation_euler = (0.14, 0, 0)
    rig.pose.bones['Foot.L'].rotation_euler = (-0.06, 0, 0)

    rig.pose.bones['Thigh.R'].rotation_euler = (0.06, 0, 0)
    rig.pose.bones['Shin.R'].rotation_euler = (0.10, 0, 0)
    rig.pose.bones['Foot.R'].rotation_euler = (-0.12, 0, 0)

    rig.pose.bones['Pelvis'].location = (0, 0, -0.01 + breath * 0.006)
    rig.pose.bones['Chest'].rotation_euler = (breath * 0.016, 0, 0)
    keyframe_all(frame)

track_idle = rig.animation_data.nla_tracks.new()
track_idle.name = 'Vasiliy_Idle'
strip_idle = track_idle.strips.new('Vasiliy_Idle', 1, act_idle)

# ==============================================================================
# ACTION 3: Vasiliy_Roll (Deep C-Tuck Tactical Somersault Ball)
# Note: Spine/Chest/Head point UP (+Z), so +X rotation curls them FORWARD (-Y)!
# Thigh/Shin point DOWN (-Z), so -X on Thigh lifts knees FORWARD (-Y) and +X on Shin bends knees BACKWARD (+Y)!
# ==============================================================================
act_roll = bpy.data.actions.new(name='Vasiliy_Roll')
rig.animation_data.action = act_roll

for frame in range(1, 18):
    bpy.context.scene.frame_set(frame)
    reset_pose()
    t = ((frame - 1) % 16) / 16.0
    # Reaches full tight ball tuck quickly and holds through the somersault
    tuck = math.sin(t * math.pi) ** 0.45

    # Pull knees tightly into chest (-1.55 rad) and fold shins against hamstrings (+2.05 rad)
    rig.pose.bones['Thigh.L'].rotation_euler = (-1.55 * tuck, 0, 0)
    rig.pose.bones['Shin.L'].rotation_euler = (2.05 * tuck, 0, 0)
    rig.pose.bones['Foot.L'].rotation_euler = (0.45 * tuck, 0, 0)

    rig.pose.bones['Thigh.R'].rotation_euler = (-1.50 * tuck, 0, 0)
    rig.pose.bones['Shin.R'].rotation_euler = (2.00 * tuck, 0, 0)
    rig.pose.bones['Foot.R'].rotation_euler = (0.45 * tuck, 0, 0)

    # Round Spine, Chest, and Head FORWARD (+X rotation!) toward the knees into a tight ball
    rig.pose.bones['Pelvis'].location = (0, 0, -0.12 * tuck)
    rig.pose.bones['Spine'].rotation_euler = (0.68 * tuck, 0, 0)
    rig.pose.bones['Chest'].rotation_euler = (0.58 * tuck, 0, 0)
    rig.pose.bones['Head'].rotation_euler = (0.65 * tuck, 0, 0)

    keyframe_all(frame)

track_roll = rig.animation_data.nla_tracks.new()
track_roll.name = 'Vasiliy_Roll'
strip_roll = track_roll.strips.new('Vasiliy_Roll', 1, act_roll)

# Clear active action so glTF exporter cleanly exports each NLA track without active action interference
rig.animation_data.action = None
bpy.ops.object.mode_set(mode='OBJECT')

# Save Master Blend
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('blender_assets/vasiliy_character_master.blend'))
print('SAVED MASTER BLEND WITH SMOOTH SKINNING + WALK/IDLE/ROLL!')

# Export to assets/models/vasiliy.glb
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath('assets/models/vasiliy.glb'),
    export_format='GLB',
    use_selection=False,
    export_animations=True,
    export_nla_strips=True,
    export_current_frame=False,
    export_skins=True,
    export_morph=True,
    export_lights=False,
    export_cameras=False
)
print('EXPORTED VASILIY.GLB WITH ALL 3 WEAPONS & 3 ANIMATIONS!')

