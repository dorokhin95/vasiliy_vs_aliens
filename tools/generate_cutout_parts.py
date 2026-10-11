import os
from PIL import Image, ImageDraw

def create_modular_parts(output_dir):
    os.makedirs(output_dir, exist_ok=True)

    # 1. Head (Ushanka + Face) - 128x128
    head = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(head)
    # Face base
    d.rounded_rectangle([38, 48, 90, 108], radius=16, fill=(195, 135, 105, 255), outline=(20, 20, 25, 255), width=4)
    # Ushanka crown
    d.rounded_rectangle([28, 12, 100, 58], radius=14, fill=(55, 55, 60, 255), outline=(20, 20, 25, 255), width=4)
    # Front flap
    d.rounded_rectangle([36, 32, 92, 60], radius=8, fill=(75, 75, 82, 255), outline=(20, 20, 25, 255), width=3)
    # Red star
    d.polygon([(64, 36), (67, 44), (75, 44), (69, 49), (71, 56), (64, 52), (57, 56), (59, 49), (53, 44), (61, 44)],
              fill=(205, 35, 35, 255), outline=(80, 15, 15, 255))
    # Ear flaps
    d.rounded_rectangle([22, 38, 42, 94], radius=8, fill=(55, 55, 60, 255), outline=(20, 20, 25, 255), width=3)
    d.rounded_rectangle([86, 38, 106, 94], radius=8, fill=(55, 55, 60, 255), outline=(20, 20, 25, 255), width=3)
    # Wrinkles / Eyes / Beard
    d.line([48, 68, 58, 70], fill=(40, 25, 20, 255), width=3) # eye left
    d.line([70, 70, 80, 68], fill=(40, 25, 20, 255), width=3) # eye right
    d.line([54, 76, 62, 82], fill=(140, 80, 60, 255), width=3) # nose
    d.line([52, 92, 76, 92], fill=(40, 20, 20, 255), width=2) # mouth
    d.arc([46, 88, 82, 104], start=0, end=180, fill=(70, 50, 45, 255), width=3) # stubble
    head.save(os.path.join(output_dir, "part_head.png"))

    # 2. Torso (Fufayka jacket + Scarf) - 160x180
    torso = Image.new("RGBA", (160, 180), (0, 0, 0, 0))
    d = ImageDraw.Draw(torso)
    # Fufayka quilted body
    d.rounded_rectangle([32, 42, 128, 170], radius=18, fill=(72, 82, 58, 255), outline=(22, 26, 18, 255), width=4)
    # Quilted stitching vertical lines
    for x in [52, 72, 88, 108]:
        d.line([x, 58, x, 166], fill=(55, 64, 44, 255), width=3)
        # Stitch accents
        for y in range(65, 160, 14):
            d.line([x-2, y, x+2, y], fill=(40, 48, 32, 255), width=2)
    # Elbow/Chest Patches
    d.rectangle([40, 110, 60, 134], fill=(88, 78, 62, 255), outline=(30, 25, 20, 255), width=2)
    # Belt at bottom
    d.rectangle([34, 148, 126, 166], fill=(48, 42, 34, 255), outline=(20, 18, 15, 255), width=3)
    d.rectangle([72, 146, 88, 168], fill=(140, 120, 60, 255), outline=(30, 25, 15, 255), width=2) # buckle
    # Scarf / Collar wrapping around neck
    d.rounded_rectangle([42, 16, 118, 54], radius=14, fill=(108, 96, 76, 255), outline=(25, 22, 18, 255), width=4)
    d.line([54, 48, 66, 68], fill=(108, 96, 76, 255), width=8) # scarf tail
    torso.save(os.path.join(output_dir, "part_torso.png"))

    # 3. Canvas Bag (Вещмешок) - 96x96
    bag = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(bag)
    d.rounded_rectangle([14, 20, 82, 88], radius=12, fill=(115, 102, 78, 255), outline=(28, 24, 18, 255), width=4)
    d.rectangle([20, 42, 76, 52], fill=(88, 78, 60, 255), outline=(25, 20, 15, 255), width=2)
    d.line([48, 20, 48, 88], fill=(88, 78, 60, 255), width=3) # strap buckle
    bag.save(os.path.join(output_dir, "part_bag.png"))

    # 4. Upper Arm (Left & Right) - 64x96
    arm = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(arm)
    d.rounded_rectangle([14, 8, 50, 88], radius=14, fill=(72, 82, 58, 255), outline=(22, 26, 18, 255), width=4)
    d.line([32, 16, 32, 80], fill=(55, 64, 44, 255), width=3)
    arm.save(os.path.join(output_dir, "part_arm_upper.png"))

    # 5. Forearm & Glove/Hand - 64x96
    forearm = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(forearm)
    # Sleeve
    d.rounded_rectangle([16, 8, 48, 60], radius=10, fill=(72, 82, 58, 255), outline=(22, 26, 18, 255), width=4)
    # Hand/Fingerless glove
    d.rounded_rectangle([18, 56, 46, 88], radius=10, fill=(185, 125, 95, 255), outline=(22, 20, 20, 255), width=3)
    d.rectangle([18, 54, 46, 68], fill=(45, 45, 48, 255), outline=(20, 20, 20, 255), width=2) # glove cuff
    forearm.save(os.path.join(output_dir, "part_arm_lower.png"))

    # 6. Upper Leg (Pants) - 64x96
    thigh = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(thigh)
    d.rounded_rectangle([14, 8, 50, 88], radius=12, fill=(44, 48, 44, 255), outline=(18, 20, 18, 255), width=4)
    d.line([32, 16, 32, 80], fill=(32, 36, 32, 255), width=3)
    thigh.save(os.path.join(output_dir, "part_leg_upper.png"))

    # 7. Shin & Boot (Сапог) - 72x96
    boot = Image.new("RGBA", (72, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(boot)
    # Boot shaft
    d.rounded_rectangle([18, 6, 52, 60], radius=8, fill=(52, 44, 38, 255), outline=(18, 15, 12, 255), width=4)
    # Foot / Sole
    d.rounded_rectangle([12, 54, 64, 90], radius=12, fill=(40, 34, 28, 255), outline=(16, 14, 12, 255), width=4)
    # Sole tread
    d.rectangle([10, 82, 66, 92], fill=(22, 20, 18, 255))
    boot.save(os.path.join(output_dir, "part_leg_boot.png"))

    # 8. Modular Weapon: Sawed-Off Shotgun (Обрез) - 160x80
    gun = Image.new("RGBA", (160, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(gun)
    # Wooden Stock
    d.polygon([(16, 38), (56, 34), (64, 48), (28, 62)], fill=(105, 58, 36, 255), outline=(28, 16, 10, 255))
    d.line([22, 44, 52, 40], fill=(130, 75, 45, 255), width=3) # wood grain
    # Receiver / Chamber
    d.rounded_rectangle([54, 32, 84, 50], radius=4, fill=(48, 52, 56, 255), outline=(18, 20, 22, 255), width=3)
    # Double Barrels
    d.rectangle([82, 33, 148, 43], fill=(62, 66, 72, 255), outline=(20, 22, 24, 255), width=3)
    d.rectangle([82, 41, 148, 49], fill=(48, 52, 56, 255), outline=(20, 22, 24, 255), width=2)
    # Muzzle tip
    d.line([148, 32, 148, 50], fill=(20, 20, 20, 255), width=4)
    # Cloth tape wrapping around barrel
    d.polygon([(96, 32), (106, 32), (102, 50), (92, 50)], fill=(185, 175, 150, 255), outline=(40, 36, 30, 255))
    d.polygon([(112, 32), (122, 32), (118, 50), (108, 50)], fill=(185, 175, 150, 255), outline=(40, 36, 30, 255))
    gun.save(os.path.join(output_dir, "weapon_sawed_shotgun.png"))

    print("All 8 modular character cutout parts generated cleanly!")

if __name__ == "__main__":
    create_modular_parts("blender_assets/vasiliy_cutout")
