import bpy
import os

PROPS = [
    {
        'id': 'car_zhiguli',
        'obj': 'blender_assets/car_zhiguli_volumetric.obj',
        'tex': 'blender_assets/props_concepts/car_zhiguli_clean.png',
        'tex_back': 'blender_assets/props_concepts/car_zhiguli_back.png',
        'glb': 'assets/models/car_zhiguli.glb',
    },
    {
        'id': 'car_uaz',
        'obj': 'blender_assets/car_uaz_volumetric.obj',
        'tex': 'blender_assets/props_concepts/car_uaz_clean.png',
        'tex_back': 'blender_assets/props_concepts/car_uaz_back.png',
        'glb': 'assets/models/car_uaz.glb',
    },
    {
        'id': 'trash_dumpster',
        'obj': 'blender_assets/trash_dumpster_volumetric.obj',
        'tex': 'blender_assets/props_concepts/trash_dumpster_clean.png',
        'tex_back': 'blender_assets/props_concepts/trash_dumpster_back.png',
        'glb': 'assets/models/trash_dumpster.glb',
    },
    {
        'id': 'military_crate',
        'obj': 'blender_assets/military_crate_volumetric.obj',
        'tex': 'blender_assets/props_concepts/military_crate_clean.png',
        'tex_back': 'blender_assets/props_concepts/military_crate_back.png',
        'glb': 'assets/models/military_crate.glb',
    },
]

def setup_pbr_slot(mesh_obj, slot_name, new_name, img_path, roughness=0.55, metallic=0.25):
    if slot_name in mesh_obj.material_slots:
        mat = mesh_obj.material_slots[slot_name].material
    else:
        mat = bpy.data.materials.new(name=new_name)
        mesh_obj.data.materials.append(mat)
    mat.name = new_name
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    tex_node = nodes.new(type='ShaderNodeTexImage')
    tex_node.image = bpy.data.images.load(os.path.abspath(img_path))
    links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic

def build_and_export_glb(cfg):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=os.path.abspath(cfg['obj']))
    mesh_obj = bpy.context.selected_objects[0]
    mesh_obj.name = cfg['id']
    mesh_obj.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.objects.active = mesh_obj
    bpy.ops.object.transform_apply(rotation=True)

    for poly in mesh_obj.data.polygons:
        poly.use_smooth = True

    setup_pbr_slot(mesh_obj, 'Mat_Front', f"Mat_{cfg['id']}_Front", cfg['tex'], roughness=0.52, metallic=0.25)
    setup_pbr_slot(mesh_obj, 'Mat_Back', f"Mat_{cfg['id']}_Back", cfg['tex_back'], roughness=0.65, metallic=0.20)

    out_glb = os.path.abspath(cfg['glb'])
    bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB')
    print(f"[Blender GLB] Exported {out_glb}")

if __name__ == '__main__':
    for p in PROPS:
        build_and_export_glb(p)

