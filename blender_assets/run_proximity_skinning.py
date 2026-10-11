import bpy
import math
from mathutils import Vector

bpy.ops.wm.open_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

# Remove old body
old = bpy.data.objects.get('Vasiliy_Body')
if old:
    bpy.data.objects.remove(old, do_unlink=True)

# Import new model
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_generated.glb')
model = bpy.data.objects['model']
model.name = 'Vasiliy_Body'
rig = bpy.data.objects['Vasiliy_Rig']

# Rotate 180 deg around Z to face -Y, shift Z up by 1.1m
model.rotation_euler = (0, 0, math.radians(180))
model.location = (0, 0, 1.1)
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Create Armature modifier on model
mod = model.modifiers.new(name="Armature", type='ARMATURE')
mod.object = rig
model.parent = rig

# Clear existing vertex groups
model.vertex_groups.clear()

# Get all deform bones (skip Root and Weapon_Socket from direct body skinning)
deform_bones = [b for b in rig.data.bones if b.name not in ['Root', 'Weapon_Socket']]
bone_segments = {}
for b in deform_bones:
    vg = model.vertex_groups.new(name=b.name)
    bone_segments[b.name] = (b.head_local, b.tail_local, vg)

def dist_to_segment(p, a, b):
    ab = b - a
    t = (p - a).dot(ab) / (ab.dot(ab) + 1e-8)
    t = max(0.0, min(1.0, t))
    closest = a + ab * t
    return (p - closest).length

# Proximity skinning for each vertex
for v in model.data.vertices:
    p = v.co
    # Compute distance to each bone
    dists = []
    for name, (head, tail, vg) in bone_segments.items():
        d = dist_to_segment(p, head, tail)
        # Extra penalty if bone is on wrong X side
        if name.endswith('.L') and p.x < -0.05:
            d += 0.5
        elif name.endswith('.R') and p.x > 0.05:
            d += 0.5
        dists.append((name, d, vg))
    
    # Sort by distance
    dists.sort(key=lambda x: x[1])
    # Top 3 closest bones
    top = dists[:3]
    weights = [1.0 / (d[1]**2 + 0.005) for d in top]
    tot = sum(weights)
    for i, (name, d, vg) in enumerate(top):
        w = weights[i] / tot
        if w > 0.02:
            vg.add([v.index], w, 'REPLACE')

print('PROXIMITY SKINNING COMPLETE!')
for vg in model.vertex_groups:
    print(f'{vg.name}: assigned vertices successfully')

# Save updated master blend
bpy.ops.wm.save_as_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')
print('SAVED MASTER BLEND!')
