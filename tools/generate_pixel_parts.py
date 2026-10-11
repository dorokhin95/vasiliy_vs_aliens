import os
from PIL import Image

def generate_pixel_parts():
    parts_dir = "assets/sprites/vasiliy_pixel/parts"
    os.makedirs(parts_dir, exist_ok=True)

    PAL = {
        "out": (18, 18, 22, 255),
        "hat_d": (45, 45, 52, 255),
        "hat_l": (75, 78, 86, 255),
        "star": (215, 38, 38, 255),
        "skin": (212, 142, 110, 255),
        "skin_sh": (155, 95, 75, 255),
        "beard": (65, 50, 45, 255),
        "fuf_b": (84, 98, 62, 255),
        "fuf_sh": (54, 65, 40, 255),
        "scarf": (118, 108, 88, 255),
        "belt": (52, 40, 30, 255),
        "buckle": (175, 145, 65, 255),
        "pants": (42, 45, 44, 255),
        "boots": (28, 24, 22, 255),
        "bag": (130, 116, 85, 255),
        "wood": (115, 60, 32, 255),
        "metal": (70, 75, 84, 255),
        "tape": (195, 185, 160, 255)
    }

    def save_scaled(img, name):
        # 4x scale nearest neighbor for crisp look
        scaled = img.resize((img.width * 4, img.height * 4), Image.NEAREST)
        scaled.save(os.path.join(parts_dir, f"{name}.png"))
        print(f"Saved part: {name}.png ({scaled.width}x{scaled.height})")

    # 1. Head (Down) - 24x22
    h_down = Image.new("RGBA", (24, 22), (0, 0, 0, 0))
    p = h_down.load()
    # Fill skin
    for y in range(8, 20):
        for x in range(3, 21):
            p[x, y] = PAL["skin"]
    # Beard
    for y in range(14, 20):
        for x in range(4, 20):
            p[x, y] = PAL["beard"]
    # Eyes & nose
    p[7, 11] = PAL["out"]
    p[16, 11] = PAL["out"]
    p[11, 13] = PAL["skin_sh"]
    # Ushanka crown
    for y in range(1, 9):
        for x in range(2, 22):
            p[x, y] = PAL["hat_d"]
    for y in range(2, 6):
        for x in range(4, 20):
            p[x, y] = PAL["hat_l"]
    # Front flap
    for y in range(5, 10):
        for x in range(5, 19):
            p[x, y] = PAL["hat_l"]
    # Red star
    p[11, 6] = PAL["star"]
    p[12, 6] = PAL["star"]
    p[11, 7] = PAL["star"]
    p[12, 7] = PAL["star"]
    p[10, 7] = PAL["star"]
    p[13, 7] = PAL["star"]
    # Ear flaps
    for y in range(6, 17):
        for x in range(0, 4):
            p[x, y] = PAL["hat_d"]
        for x in range(20, 24):
            p[x, y] = PAL["hat_d"]
    # Outline
    for x in range(2, 22): p[x, 0] = PAL["out"]
    for y in range(6, 18): p[0, y] = PAL["out"]; p[23, y] = PAL["out"]
    for x in range(4, 20): p[x, 21] = PAL["out"]
    save_scaled(h_down, "part_head_down")

    # 2. Torso (Fufayka) - 24x26
    torso = Image.new("RGBA", (24, 26), (0, 0, 0, 0))
    p = torso.load()
    # Body
    for y in range(5, 23):
        for x in range(2, 22):
            p[x, y] = PAL["fuf_b"]
    # Stitches
    for y in range(7, 21, 3):
        for x in [6, 11, 16]:
            p[x, y] = PAL["fuf_sh"]
    # Scarf collar
    for y in range(1, 6):
        for x in range(4, 20):
            p[x, y] = PAL["scarf"]
    # Belt
    for y in range(21, 25):
        for x in range(2, 22):
            p[x, y] = PAL["belt"]
    for y in range(21, 25):
        for x in range(10, 14):
            p[x, y] = PAL["buckle"]
    # Outlines
    for x in range(2, 22):
        p[x, 0] = PAL["out"]
        p[x, 25] = PAL["out"]
    for y in range(1, 25):
        p[1, y] = PAL["out"]
        p[22, y] = PAL["out"]
    save_scaled(torso, "part_torso")

    # 3. Leg Upper (Thigh) - 10x14
    thigh = Image.new("RGBA", (10, 14), (0, 0, 0, 0))
    p = thigh.load()
    for y in range(1, 13):
        for x in range(1, 9):
            p[x, y] = PAL["pants"]
    for x in range(1, 9): p[x, 0] = PAL["out"]; p[x, 13] = PAL["out"]
    for y in range(0, 14): p[0, y] = PAL["out"]; p[9, y] = PAL["out"]
    save_scaled(thigh, "part_leg_thigh")

    # 4. Boot (Foot) - 12x12
    boot = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
    p = boot.load()
    for y in range(1, 11):
        for x in range(1, 11):
            p[x, y] = PAL["boots"]
    for x in range(1, 11): p[x, 0] = PAL["out"]; p[x, 11] = PAL["out"]
    for y in range(0, 12): p[0, y] = PAL["out"]; p[11, y] = PAL["out"]
    save_scaled(boot, "part_leg_boot")

    # 5. Arm Upper & Forearm - 8x14
    arm = Image.new("RGBA", (8, 14), (0, 0, 0, 0))
    p = arm.load()
    for y in range(1, 10):
        for x in range(1, 7):
            p[x, y] = PAL["fuf_b"]
    for y in range(10, 13):
        for x in range(1, 7):
            p[x, y] = PAL["skin"]
    for x in range(1, 7): p[x, 0] = PAL["out"]; p[x, 13] = PAL["out"]
    for y in range(0, 14): p[0, y] = PAL["out"]; p[7, y] = PAL["out"]
    save_scaled(arm, "part_arm")

    # 6. Modular Sawed-Off Shotgun - 28x10
    gun = Image.new("RGBA", (28, 10), (0, 0, 0, 0))
    p = gun.load()
    # Wood stock
    for y in range(2, 8):
        for x in range(1, 9):
            p[x, y] = PAL["wood"]
    # Receiver & barrels
    for y in range(3, 7):
        for x in range(9, 27):
            p[x, y] = PAL["metal"]
    # Tape wrapping
    for y in range(3, 7):
        for x in [14, 15, 20, 21]:
            p[x, y] = PAL["tape"]
    # Outlines
    for x in range(1, 27):
        p[x, 1] = PAL["out"]
        p[x, 8] = PAL["out"]
    p[0, 5] = PAL["out"]
    p[27, 4] = PAL["out"]
    p[27, 5] = PAL["out"]
    save_scaled(gun, "part_weapon_shotgun")

    # 7. Modular Canvas Shoulder Bag - 14x16
    bag = Image.new("RGBA", (14, 16), (0, 0, 0, 0))
    p = bag.load()
    for y in range(1, 15):
        for x in range(1, 13):
            p[x, y] = PAL["bag"]
    for x in range(1, 13):
        p[x, 0] = PAL["out"]
        p[x, 15] = PAL["out"]
    for y in range(0, 16):
        p[0, y] = PAL["out"]
        p[13, y] = PAL["out"]
    save_scaled(bag, "part_bag")

    print("\nAll modular pixel parts generated for Spriter project!")

if __name__ == "__main__":
    generate_pixel_parts()
