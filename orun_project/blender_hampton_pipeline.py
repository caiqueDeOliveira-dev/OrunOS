import bpy
import bmesh
import math
from mathutils import Vector, Euler, Matrix
import os

# ============================================================
# CONFIGURATION
# ============================================================
REF_WOLF_TPOSE = r"C:\Users\Caiqu\Downloads\ChatGPT Image 11 de set. de 2026, 18_17_15.png"
REF_THRONE = r"C:\Users\Caiqu\Downloads\ChatGPT Image 11 de set. de 2026, 18_16_20.png"
REF_ORIGINAL = r"C:\Users\Caiqu\Downloads\Foto pra modelo 3D.png"

OUTPUT_DIR = r"C:\Users\Caiqu\OneDrive\Desktop\orun-os\orun_project\public\Hampton\stock"
WOLF_GLB = os.path.join(OUTPUT_DIR, "hampton-lobo-tpose-rig-glb.glb")
THRONE_GLB = os.path.join(OUTPUT_DIR, "hampton-trono.glb")

# ============================================================
# UTILITY FUNCTIONS
# ============================================================
def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)
    for block in bpy.data.actions:
        if block.users == 0:
            bpy.data.actions.remove(block)
    for block in bpy.data.images:
        if block.users == 0:
            bpy.data.images.remove(block)

def create_material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    
    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat

def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ============================================================
# REFERENCE IMAGES SETUP
# ============================================================
def setup_reference_images():
    # Create empty reference planes with image textures
    def create_ref_plane(name, filepath, location, rotation=(0, 0, 0)):
        if not os.path.exists(filepath):
            return
        bpy.ops.mesh.primitive_plane_add(size=4, location=location, rotation=rotation)
        plane = bpy.context.active_object
        plane.name = name
        plane.display_type = 'WIRE'
        plane.show_in_front = True
        
        # Add image texture
        img = bpy.data.images.load(filepath)
        mat = bpy.data.materials.new(name=f"Mat_{name}")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = img
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.inputs['Alpha'].default_value = 0.5
        out = nodes.new('ShaderNodeOutputMaterial')
        links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
        links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
        mat.blend_method = 'BLEND'
        plane.data.materials.append(mat)
    
    # Wolf T-pose reference
    create_ref_plane("Ref_Wolf_Tpose", REF_WOLF_TPOSE, (0, -5, 0))
    
    # Throne reference
    create_ref_plane("Ref_Throne", REF_THRONE, (10, 0, 0), (0, 0, math.radians(90)))

# ============================================================
# WOLF MODELING (T-POSE QUADRUPED)
# ============================================================
def create_wolf_body():
    # Create body parts for a wolf in T-pose (standing on 4 legs, front legs forward)
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 1.2))
    body = bpy.context.active_object
    body.name = "Wolf_Body"
    
    # Shape the body - elongated torso
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(body.data)
    
    # Scale vertices to make wolf shape
    for v in bm.verts:
        x, y, z = v.co
        # Elongate along Y (spine)
        v.co.y *= 1.8
        # Narrow waist
        if abs(y) < 0.5:
            v.co.x *= 0.7
            v.co.z *= 0.9
        # Chest broader
        elif y > 0.5:
            v.co.x *= 1.1
            v.co.z *= 1.1
        # Hindquarters
        elif y < -0.5:
            v.co.x *= 0.9
            v.co.z *= 1.0
    
    bmesh.update_edit_mesh(body.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Head
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 2.2, 1.8))
    head = bpy.context.active_object
    head.name = "Wolf_Head"
    head.scale = (0.8, 1.0, 0.7)
    apply_transform(head)
    
    # Snout
    bpy.ops.mesh.primitive_cube_add(size=0.6, location=(0, 2.9, 1.6))
    snout = bpy.context.active_object
    snout.name = "Wolf_Snout"
    snout.scale = (0.7, 1.2, 0.6)
    apply_transform(snout)
    
    # Ears
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cone_add(radius1=0.15, radius2=0.02, depth=0.4, location=(side*0.3, 2.0, 2.2))
        ear = bpy.context.active_object
        ear.name = f"Wolf_Ear_{'L' if side < 0 else 'R'}"
        ear.rotation_euler = (math.radians(-30), 0, side * math.radians(20))
        apply_transform(ear)
    
    # Eyes
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(side*0.25, 2.6, 1.9))
        eye = bpy.context.active_object
        eye.name = f"Wolf_Eye_{'L' if side < 0 else 'R'}"
        eye.scale = (1, 0.5, 1)
        apply_transform(eye)
    
    # Tail
    bpy.ops.mesh.primitive_cube_add(size=0.3, location=(0, -2.2, 1.5))
    tail = bpy.context.active_object
    tail.name = "Wolf_Tail"
    tail.scale = (0.3, 1.5, 0.3)
    apply_transform(tail)
    
    # Legs - Front legs (forward in T-pose)
    leg_positions = [
        (-0.6, 1.0, 0.0),   # Front left
        (0.6, 1.0, 0.0),    # Front right
        (-0.5, -1.3, 0.0),  # Hind left
        (0.5, -1.3, 0.0),   # Hind right
    ]
    
    leg_names = ["FL", "FR", "HL", "HR"]
    
    for i, (x, y, z) in enumerate(leg_positions):
        # Upper leg
        bpy.ops.mesh.primitive_cube_add(size=0.3, location=(x, y, z + 0.6))
        upper = bpy.context.active_object
        upper.name = f"Wolf_UpperLeg_{leg_names[i]}"
        upper.scale = (1, 1, 2)
        apply_transform(upper)
        
        # Lower leg
        bpy.ops.mesh.primitive_cube_add(size=0.25, location=(x, y, z - 0.4))
        lower = bpy.context.active_object
        lower.name = f"Wolf_LowerLeg_{leg_names[i]}"
        lower.scale = (1, 1, 2)
        apply_transform(lower)
        
        # Paw
        bpy.ops.mesh.primitive_cube_add(size=0.25, location=(x, y, z - 1.2))
        paw = bpy.context.active_object
        paw.name = f"Wolf_Paw_{leg_names[i]}"
        paw.scale = (1.2, 1.2, 0.4)
        apply_transform(paw)
    
    # Join all wolf parts
    wolf_parts = [body, head, snout, tail]
    wolf_parts += [o for o in bpy.data.objects if o.name.startswith("Wolf_")]
    
    bpy.ops.object.select_all(action='DESELECT')
    for part in wolf_parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    body.name = "Wolf_Mesh"
    
    return body

def create_wolf_rig(wolf_mesh):
    # Create armature for quadruped
    bpy.ops.object.armature_add(location=(0, 0, 1.2))
    armature = bpy.context.active_object
    armature.name = "Wolf_Rig"
    armature.data.name = "Wolf_Rig_Data"
    
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='EDIT')
    
    bones = armature.data.edit_bones
    
    # Root bone
    root = bones.new("Root")
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.5)
    
    # Spine chain
    spine_names = ["Spine_01", "Spine_02", "Spine_03", "Neck", "Head"]
    spine_positions = [
        (0, 0, 0.5), (0, 0.5, 0.8), (0, 1.2, 1.1), (0, 1.8, 1.5), (0, 2.4, 1.8)
    ]
    
    prev_bone = root
    for name, pos in zip(spine_names, spine_positions):
        bone = bones.new(name)
        bone.head = pos
        bone.tail = (pos[0], pos[1] + 0.3, pos[2] + 0.2)
        bone.parent = prev_bone
        bone.use_connect = True
        prev_bone = bone
    
    head_bone = prev_bone
    
    # Snout bone
    snout_bone = bones.new("Snout")
    snout_bone.head = (0, 2.7, 1.7)
    snout_bone.tail = (0, 3.2, 1.5)
    snout_bone.parent = head_bone
    snout_bone.use_connect = True
    
    # Ear bones
    for side, suffix in [(-1, "L"), (1, "R")]:
        ear_bone = bones.new(f"Ear_{suffix}")
        ear_bone.head = (side * 0.3, 2.0, 2.2)
        ear_bone.tail = (side * 0.4, 1.8, 2.6)
        ear_bone.parent = head_bone
    
    # Tail bones
    tail_bones = []
    for i in range(5):
        tb = bones.new(f"Tail_{i+1:02d}")
        tb.head = (0, -2.2 + i * 0.3, 1.5 + i * 0.1)
        tb.tail = (0, -2.2 + (i+1) * 0.3, 1.5 + (i+1) * 0.1)
        if i == 0:
            tb.parent = root
            tb.use_connect = True
        else:
            tb.parent = tail_bones[-1]
            tb.use_connect = True
        tail_bones.append(tb)
    
    # Leg bones - Front Left
    leg_chains = [
        ("FL", (-0.6, 1.0, 1.2), (-0.6, 1.0, 0.4), (-0.6, 1.0, -0.4)),
        ("FR", (0.6, 1.0, 1.2), (0.6, 1.0, 0.4), (0.6, 1.0, -0.4)),
        ("HL", (-0.5, -1.3, 1.2), (-0.5, -1.3, 0.4), (-0.5, -1.3, -0.4)),
        ("HR", (0.5, -1.3, 1.2), (0.5, -1.3, 0.4), (0.5, -1.3, -0.4)),
    ]
    
    for suffix, upper_pos, lower_pos, paw_pos in leg_chains:
        # Upper leg
        upper = bones.new(f"UpperLeg_{suffix}")
        upper.head = upper_pos
        upper.tail = lower_pos
        if suffix in ["FL", "FR"]:
            upper.parent = bones["Spine_03"]
        else:
            upper.parent = root
        upper.use_connect = False
        
        # Lower leg
        lower = bones.new(f"LowerLeg_{suffix}")
        lower.head = lower_pos
        lower.tail = paw_pos
        lower.parent = upper
        lower.use_connect = True
        
        # Paw
        paw = bones.new(f"Paw_{suffix}")
        paw.head = paw_pos
        paw.tail = (paw_pos[0], paw_pos[1], paw_pos[2] - 0.3)
        paw.parent = lower
        paw.use_connect = True
    
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Parent mesh to armature with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    wolf_mesh.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    
    # Add IK constraints for legs
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    
    pbones = armature.pose.bones
    
    # IK for front legs
    for suffix in ["FL", "FR"]:
        lower = pbones[f"LowerLeg_{suffix}"]
        ik = lower.constraints.new('IK')
        ik.target = armature
        ik.subtarget = f"Paw_{suffix}"
        ik.chain_count = 2
        ik.iterations = 16
    
    # IK for hind legs
    for suffix in ["HL", "HR"]:
        lower = pbones[f"LowerLeg_{suffix}"]
        ik = lower.constraints.new('IK')
        ik.target = armature
        ik.subtarget = f"Paw_{suffix}"
        ik.chain_count = 2
        ik.iterations = 16
    
    bpy.ops.object.mode_set(mode='OBJECT')
    
    return armature

def create_wolf_animations(armature):
    # Create actions for Sit and Idle
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    
    # ===== IDLE ANIMATION =====
    idle_action = bpy.data.actions.new(name="Wolf_Idle")
    armature.animation_data_create()
    armature.animation_data.action = idle_action
    
    pbones = armature.pose.bones
    
    # Subtle breathing motion
    frames = [1, 30, 60]
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        
        # Spine breathing
        for spine_name in ["Spine_01", "Spine_02", "Spine_03"]:
            if spine_name in pbones:
                pbones[spine_name].rotation_euler = (0, math.sin(frame * 0.1) * 0.02, 0)
                pbones[spine_name].keyframe_insert("rotation_euler", frame=frame)
        
        # Head subtle movement
        if "Head" in pbones:
            pbones["Head"].rotation_euler = (math.sin(frame * 0.08) * 0.05, 0, math.sin(frame * 0.06) * 0.03)
            pbones["Head"].keyframe_insert("rotation_euler", frame=frame)
        
        # Tail sway
        for i in range(5):
            tail_name = f"Tail_{i+1:02d}"
            if tail_name in pbones:
                pbones[tail_name].rotation_euler = (0, 0, math.sin(frame * 0.1 + i * 0.3) * 0.1)
                pbones[tail_name].keyframe_insert("rotation_euler", frame=frame)
    
    idle_action.frame_range = (1, 60)
    idle_action.use_fake_user = True
    
    # ===== SIT ANIMATION =====
    sit_action = bpy.data.actions.new(name="Wolf_Sit")
    armature.animation_data.action = sit_action
    
    sit_frames = [1, 15, 30]
    for frame in sit_frames:
        bpy.context.scene.frame_set(frame)
        progress = (frame - 1) / 29  # 0 to 1
        
        # Hind legs fold
        for suffix in ["HL", "HR"]:
            if f"UpperLeg_{suffix}" in pbones:
                pbones[f"UpperLeg_{suffix}"].rotation_euler = (
                    math.radians(-90 * progress), 0, 0
                )
                pbones[f"UpperLeg_{suffix}"].keyframe_insert("rotation_euler", frame=frame)
            
            if f"LowerLeg_{suffix}" in pbones:
                pbones[f"LowerLeg_{suffix}"].rotation_euler = (
                    math.radians(90 * progress), 0, 0
                )
                pbones[f"LowerLeg_{suffix}"].keyframe_insert("rotation_euler", frame=frame)
        
        # Front legs stay but bend slightly
        for suffix in ["FL", "FR"]:
            if f"UpperLeg_{suffix}" in pbones:
                pbones[f"UpperLeg_{suffix}"].rotation_euler = (
                    math.radians(-20 * progress), 0, 0
                )
                pbones[f"UpperLeg_{suffix}"].keyframe_insert("rotation_euler", frame=frame)
            
            if f"LowerLeg_{suffix}" in pbones:
                pbones[f"LowerLeg_{suffix}"].rotation_euler = (
                    math.radians(30 * progress), 0, 0
                )
                pbones[f"LowerLeg_{suffix}"].keyframe_insert("rotation_euler", frame=frame)
        
        # Spine curves back
        for i, spine_name in enumerate(["Spine_01", "Spine_02", "Spine_03"]):
            if spine_name in pbones:
                pbones[spine_name].rotation_euler = (
                    math.radians(-15 * progress * (i+1)), 0, 0
                )
                pbones[spine_name].keyframe_insert("rotation_euler", frame=frame)
        
        # Head looks forward/down slightly
        if "Head" in pbones:
            pbones["Head"].rotation_euler = (
                math.radians(-10 * progress), 0, 0
            )
            pbones["Head"].keyframe_insert("rotation_euler", frame=frame)
        
        # Tail tucks
        for i in range(5):
            tail_name = f"Tail_{i+1:02d}"
            if tail_name in pbones:
                pbones[tail_name].rotation_euler = (
                    math.radians(-30 * progress * (i+1)), 0, 0
                )
                pbones[tail_name].keyframe_insert("rotation_euler", frame=frame)
        
        # Root moves down and back
        if "Root" in pbones:
            pbones["Root"].location = (0, -0.5 * progress, -0.8 * progress)
            pbones["Root"].keyframe_insert("location", frame=frame)
    
    sit_action.frame_range = (1, 30)
    sit_action.use_fake_user = True
    
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.scene.frame_set(1)
    
    return idle_action, sit_action

# ============================================================
# THRONE MODELING
# ============================================================
def create_throne():
    # Dark fantasy throne with red glowing accents, black metallic armor style
    throne_parts = []
    
    # Base platform
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.3))
    base = bpy.context.active_object
    base.name = "Throne_Base"
    base.scale = (1.5, 1.2, 0.3)
    apply_transform(base)
    throne_parts.append(base)
    
    # Seat
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, -0.3, 0.8))
    seat = bpy.context.active_object
    seat.name = "Throne_Seat"
    seat.scale = (1.2, 0.8, 0.2)
    apply_transform(seat)
    throne_parts.append(seat)
    
    # Backrest - tall and ornate
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, -0.9, 2.0))
    backrest = bpy.context.active_object
    backrest.name = "Throne_Backrest"
    backrest.scale = (1.3, 0.2, 2.5)
    apply_transform(backrest)
    throne_parts.append(backrest)
    
    # Backrest decorative top (crown-like)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -1.1, 4.0))
    crown = bpy.context.active_object
    crown.name = "Throne_Crown"
    crown.scale = (1.5, 0.15, 0.5)
    apply_transform(crown)
    throne_parts.append(crown)
    
    # Side armrests
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 1.4, -0.3, 1.0))
        arm = bpy.context.active_object
        arm.name = f"Throne_Armrest_{'L' if side < 0 else 'R'}"
        arm.scale = (0.2, 0.8, 0.8)
        apply_transform(arm)
        throne_parts.append(arm)
        
        # Armrest top decoration (claw/skull)
        bpy.ops.mesh.primitive_cone_add(radius1=0.2, radius2=0.05, depth=0.5, 
                                         location=(side * 1.5, -0.3, 1.5))
        claw = bpy.context.active_object
        claw.name = f"Throne_Claw_{'L' if side < 0 else 'R'}"
        claw.rotation_euler = (math.radians(90), 0, 0)
        apply_transform(claw)
        throne_parts.append(claw)
    
    # Decorative spikes on backrest
    for i in range(5):
        y_pos = -1.0
        z_pos = 1.0 + i * 0.6
        bpy.ops.mesh.primitive_cone_add(radius1=0.08, radius2=0.01, depth=0.4, 
                                         location=(0, y_pos, z_pos))
        spike = bpy.context.active_object
        spike.name = f"Throne_Spike_{i}"
        spike.rotation_euler = (math.radians(90), 0, 0)
        apply_transform(spike)
        throne_parts.append(spike)
    
    # Front decorative pillars
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=1.5, 
                                             location=(side * 1.3, 0.6, 0.75))
        pillar = bpy.context.active_object
        pillar.name = f"Throne_Pillar_{'L' if side < 0 else 'R'}"
        apply_transform(pillar)
        throne_parts.append(pillar)
    
    # Join all throne parts
    bpy.ops.object.select_all(action='DESELECT')
    for part in throne_parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = throne_parts[0]
    bpy.ops.object.join()
    throne = bpy.context.active_object
    throne.name = "Throne_Mesh"
    
    return throne

# ============================================================
# MATERIALS
# ============================================================
def setup_materials(wolf_mesh, throne_mesh):
    # Wolf materials - dark fur
    wolf_fur = create_material("Wolf_Fur", (0.1, 0.08, 0.07), metallic=0.0, roughness=0.9)
    wolf_dark = create_material("Wolf_Dark", (0.05, 0.03, 0.02), metallic=0.1, roughness=0.8)
    wolf_eye = create_material("Wolf_Eye", (0.9, 0.3, 0.1), metallic=0.0, roughness=0.2, 
                                emission=(1.0, 0.3, 0.0), emission_strength=2.0)
    wolf_claw = create_material("Wolf_Claw", (0.15, 0.12, 0.1), metallic=0.3, roughness=0.6)
    
    # Throne materials - black metallic armor with red glowing accents
    throne_metal = create_material("Throne_Metal", (0.08, 0.06, 0.06), metallic=0.9, roughness=0.3)
    throne_dark = create_material("Throne_Dark", (0.03, 0.02, 0.02), metallic=0.8, roughness=0.4)
    throne_gold = create_material("Throne_Gold", (0.6, 0.45, 0.1), metallic=0.8, roughness=0.2)
    throne_red_glow = create_material("Throne_RedGlow", (0.1, 0.0, 0.0), metallic=0.5, roughness=0.3,
                                       emission=(1.0, 0.0, 0.0), emission_strength=5.0)
    
    # Assign to wolf
    wolf_mesh.data.materials.clear()
    wolf_mesh.data.materials.append(wolf_fur)
    wolf_mesh.data.materials.append(wolf_dark)
    wolf_mesh.data.materials.append(wolf_eye)
    wolf_mesh.data.materials.append(wolf_claw)
    
    # Assign to throne
    throne_mesh.data.materials.clear()
    throne_mesh.data.materials.append(throne_metal)
    throne_mesh.data.materials.append(throne_dark)
    throne_mesh.data.materials.append(throne_gold)
    throne_mesh.data.materials.append(throne_red_glow)
    
    # Simple material assignment by vertex groups or loose parts
    # For simplicity, assign main material to all
    for poly in wolf_mesh.data.polygons:
        poly.material_index = 0
    
    for poly in throne_mesh.data.polygons:
        poly.material_index = 0
    
    # Add red glow to specific throne parts (crown, spikes, claws)
    # This would need vertex groups - simplified here

# ============================================================
# EXPORT GLB
# ============================================================
def export_glb(obj, filepath, armature=None):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    if armature:
        armature.select_set(True)
    bpy.context.view_layer.objects.active = obj
    
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        use_selection=True,
        export_format='GLB',
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_morph=False,
        export_tangents=True,
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
    )

# ============================================================
# MAIN PIPELINE
# ============================================================
def main():
    print("=== HAMPTON 3D PIPELINE START ===")
    
    clear_scene()
    setup_reference_images()
    
    # Create wolf
    print("Creating wolf mesh...")
    wolf_mesh = create_wolf_body()
    
    print("Creating wolf rig...")
    wolf_rig = create_wolf_rig(wolf_mesh)
    
    print("Creating wolf animations...")
    idle_action, sit_action = create_wolf_animations(wolf_rig)
    
    # Create throne
    print("Creating throne...")
    throne_mesh = create_throne()
    
    # Materials
    print("Setting up materials...")
    setup_materials(wolf_mesh, throne_mesh)
    
    # Export
    print(f"Exporting wolf to {WOLF_GLB}...")
    export_glb(wolf_mesh, WOLF_GLB, wolf_rig)
    
    print(f"Exporting throne to {THRONE_GLB}...")
    export_glb(throne_mesh, THRONE_GLB)
    
    print("=== HAMPTON 3D PIPELINE COMPLETE ===")
    print(f"Wolf GLB: {WOLF_GLB}")
    print(f"Throne GLB: {THRONE_GLB}")

if __name__ == "__main__":
    main()