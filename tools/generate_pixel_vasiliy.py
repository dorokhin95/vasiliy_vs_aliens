import os
from PIL import Image

# 16-Color Curated Post-Apocalyptic Soviet Palette
PALETTE = {
    "outline": (18, 18, 22, 255),        # Deep dark outline
    "ushanka_dark": (45, 45, 52, 255),    # Dark grey fur
    "ushanka_light": (75, 78, 86, 255),   # Mid grey fur
    "star_red": (215, 38, 38, 255),       # Soviet star
    "star_dark": (120, 20, 20, 255),
    "skin_base": (212, 142, 110, 255),    # Weathered skin
    "skin_shadow": (155, 95, 75, 255),
    "beard": (65, 50, 45, 255),           # Stubble / beard
    "fufayka_base": (84, 98, 62, 255),    # Quilted khaki jacket
    "fufayka_shadow": (54, 65, 40, 255),
    "fufayka_stitch": (38, 46, 28, 255),
    "scarf": (118, 108, 88, 255),         # Dirty wool scarf
    "belt_leather": (52, 40, 30, 255),
    "belt_buckle": (175, 145, 65, 255),
    "pants": (42, 45, 44, 255),           # Quilted padded trousers
    "boots": (28, 24, 22, 255),           # Tar leather boots
    "bag": (130, 116, 85, 255),           # Canvas bag
    "wood_stock": (115, 60, 32, 255),     # Shotgun stock
    "gun_metal": (70, 75, 84, 255),       # Shotgun barrels
    "tape": (195, 185, 160, 255)          # Cloth wrap
}

def draw_pixel_char(direction, step):
    # Canvas 48x64 (Classic Roguelite format)
    W, H = 48, 64
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = img.load()

    def p(x, y, col):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = PALETTE[col]

    def rect(x1, y1, x2, y2, col):
        for y in range(y1, y2 + 1):
            for x in range(x1, x2 + 1):
                p(x, y, col)

    def outline_box(x1, y1, x2, y2, fill_col):
        rect(x1, y1, x2, y2, fill_col)
        # Outline edges
        for x in range(x1, x2 + 1):
            p(x, y1, "outline")
            p(x, y2, "outline")
        for y in range(y1, y2 + 1):
            p(x1, y, "outline")
            p(x2, y, "outline")

    # Bobbing motion calculation for walk
    bob = 0
    if step in [1, 3]:
        bob = 1

    # --- 1. LEGS & BOOTS ---
    # step: 0=idle, 1=left forward, 2=passing, 3=right forward
    leg_offset_l = 0
    leg_offset_r = 0
    if direction in ["side", "left"]:
        if step == 1:
            leg_offset_l = 3
            leg_offset_r = -3
        elif step == 3:
            leg_offset_l = -3
            leg_offset_r = 3
    elif direction in ["down", "up"]:
        if step == 1:
            leg_offset_l = -2
        elif step == 3:
            leg_offset_r = -2

    # Left Leg
    outline_box(16 + leg_offset_l, 44 - bob, 22 + leg_offset_l, 54 - bob, "pants")
    outline_box(15 + leg_offset_l, 54 - bob, 23 + leg_offset_l, 61, "boots")

    # Right Leg
    outline_box(26 + leg_offset_r, 44 - bob, 32 + leg_offset_r, 54 - bob, "pants")
    outline_box(25 + leg_offset_r, 54 - bob, 33 + leg_offset_r, 61, "boots")

    # --- 2. TORSO (FUFAYKA) ---
    outline_box(14, 25 - bob, 34, 45 - bob, "fufayka_base")
    # Quilted stitching vertical lines
    for sx in [19, 24, 29]:
        for sy in range(27 - bob, 43 - bob, 3):
            p(sx, sy, "fufayka_stitch")
            p(sx, sy + 1, "fufayka_shadow")

    # Belt
    rect(15, 41 - bob, 33, 44 - bob, "belt_leather")
    if direction != "up":
        rect(22, 41 - bob, 26, 44 - bob, "belt_buckle")

    # Scarf / Collar
    outline_box(16, 21 - bob, 32, 26 - bob, "scarf")

    # Shoulder Canvas Bag
    if direction in ["side", "down"]:
        outline_box(30, 31 - bob, 37, 43 - bob, "bag")
        # Strap across chest
        for i in range(12):
            p(17 + i, 23 + i - bob, "belt_leather")
    elif direction == "up":
        outline_box(28, 29 - bob, 36, 42 - bob, "bag")
        for i in range(12):
            p(17 + i, 23 + i - bob, "belt_leather")

    # --- 3. HEAD & USHANKA ---
    head_y = 7 - bob

    if direction == "down":
        # Face
        outline_box(17, head_y + 8, 31, head_y + 19, "skin_base")
        # Stubble / Beard
        rect(18, head_y + 15, 30, head_y + 19, "beard")
        # Nose & Eyes
        p(24, head_y + 13, "skin_shadow")
        p(20, head_y + 11, "outline") # eye left
        p(28, head_y + 11, "outline") # eye right
        # Ushanka Fur Crown
        outline_box(15, head_y, 33, head_y + 9, "ushanka_dark")
        rect(17, head_y + 1, 31, head_y + 5, "ushanka_light")
        # Front Flap
        outline_box(18, head_y + 5, 30, head_y + 10, "ushanka_light")
        # Red Star
        rect(23, head_y + 6, 25, head_y + 8, "star_red")
        p(24, head_y + 5, "star_red")
        # Ear Flaps hanging down
        outline_box(13, head_y + 5, 17, head_y + 16, "ushanka_dark")
        outline_box(31, head_y + 5, 35, head_y + 16, "ushanka_dark")

    elif direction == "up":
        # Back of Ushanka
        outline_box(15, head_y, 33, head_y + 16, "ushanka_dark")
        rect(17, head_y + 2, 31, head_y + 12, "ushanka_light")
        # Ear flaps from back
        outline_box(13, head_y + 6, 16, head_y + 16, "ushanka_dark")
        outline_box(32, head_y + 6, 35, head_y + 16, "ushanka_dark")

    elif direction in ["side", "left"]:
        # Profile / 3/4 Face
        outline_box(18, head_y + 8, 30, head_y + 19, "skin_base")
        rect(19, head_y + 14, 29, head_y + 19, "beard")
        p(28, head_y + 12, "skin_shadow") # nose tip
        p(25, head_y + 11, "outline")     # eye
        # Ushanka
        outline_box(16, head_y, 32, head_y + 9, "ushanka_dark")
        rect(18, head_y + 1, 30, head_y + 5, "ushanka_light")
        # Front flap side
        outline_box(23, head_y + 5, 31, head_y + 9, "ushanka_light")
        p(27, head_y + 6, "star_red")
        # Side ear flap
        outline_box(17, head_y + 5, 23, head_y + 16, "ushanka_dark")

    # --- 4. ARMS & WEAPON (SAWED-OFF SHOTGUN) ---
    if direction == "down":
        # Left arm
        outline_box(10, 26 - bob, 14, 38 - bob, "fufayka_base")
        outline_box(10, 38 - bob, 14, 42 - bob, "skin_base")
        # Right arm
        outline_box(34, 26 - bob, 38, 38 - bob, "fufayka_base")
        outline_box(34, 38 - bob, 38, 42 - bob, "skin_base")
        # Shotgun held across front
        rect(16, 37 - bob, 22, 40 - bob, "wood_stock")
        outline_box(22, 36 - bob, 36, 40 - bob, "gun_metal")
        # Tape wrap
        rect(28, 36 - bob, 30, 40 - bob, "tape")

    elif direction == "up":
        # Arms from back
        outline_box(10, 26 - bob, 14, 38 - bob, "fufayka_base")
        outline_box(34, 26 - bob, 38, 38 - bob, "fufayka_base")
        # Gun barrel peeking on side
        rect(8, 30 - bob, 11, 33 - bob, "gun_metal")

    elif direction == "side":
        # Arm holding shotgun forward
        outline_box(18, 27 - bob, 26, 36 - bob, "fufayka_base")
        outline_box(26, 31 - bob, 32, 36 - bob, "skin_base") # hand
        # Sawed-off shotgun aimed right
        rect(19, 34 - bob, 25, 37 - bob, "wood_stock")
        outline_box(25, 33 - bob, 41, 37 - bob, "gun_metal")
        rect(31, 33 - bob, 33, 37 - bob, "tape")
        rect(36, 33 - bob, 38, 37 - bob, "tape")

    if direction == "left":
        # Flip image horizontally for perfect left orientation
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    return img

def generate_pixel_character_set():
    out_dir = "assets/sprites/vasiliy_pixel/anims"
    os.makedirs(out_dir, exist_ok=True)

    directions = ["down", "up", "side", "left"]
    # 4 animation frames per direction
    for d in directions:
        actual_dir = "side" if d == "left" else d
        for step in range(4):
            frame = draw_pixel_char(d, step)
            # Scale up crisply 4x with NEAREST filter for crisp high-def pixel art (192x256)
            scaled = frame.resize((192, 256), Image.NEAREST)
            out_file = os.path.join(out_dir, f"vasiliy_{d}_{step}.png")
            scaled.save(out_file)
            print(f"Generated pixel sprite: {out_file} (48x64 -> 192x256)")

    print("\nComplete pixel art character set for Vasily generated successfully!")

if __name__ == "__main__":
    generate_pixel_character_set()
