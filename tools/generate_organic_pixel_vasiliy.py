import os
from PIL import Image

PALETTE = {
    "out": (18, 18, 22, 255),
    "fur_d": (40, 42, 48, 255),
    "fur_m": (62, 66, 75, 255),
    "fur_l": (88, 92, 102, 255),
    "star": (220, 35, 35, 255),
    "skin_l": (225, 155, 120, 255),
    "skin_m": (195, 125, 95, 255),
    "skin_d": (150, 90, 68, 255),
    "beard": (58, 44, 38, 255),
    "fuf_l": (95, 110, 70, 255),
    "fuf_m": (74, 88, 54, 255),
    "fuf_d": (50, 60, 36, 255),
    "stitch": (35, 42, 26, 255),
    "scarf": (125, 112, 90, 255),
    "belt": (48, 36, 26, 255),
    "buckle": (185, 150, 65, 255),
    "pants_l": (52, 56, 54, 255),
    "pants_d": (36, 38, 37, 255),
    "boot_l": (42, 36, 32, 255),
    "boot_d": (22, 18, 16, 255),
    "bag": (135, 118, 88, 255),
    "wood_l": (130, 70, 38, 255),
    "wood_d": (85, 42, 22, 255),
    "metal_l": (100, 108, 120, 255),
    "metal_m": (68, 74, 82, 255),
    "metal_d": (42, 46, 52, 255),
    "tape": (195, 185, 158, 255)
}

def draw_organic_pixel_vasiliy(direction, frame):
    # Canvas 64x80 for higher fidelity and rounded silhouettes
    W, H = 64, 80
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = img.load()

    def set_px(x, y, col):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = PALETTE[col]

    def h_line(x1, x2, y, col):
        for x in range(x1, x2 + 1):
            set_px(x, y, col)

    def circle(cx, cy, r, col):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if (x - cx)**2 + (y - cy)**2 <= r**2:
                    set_px(x, y, col)

    # Bobbing
    bob = 1 if frame in [1, 3] else 0

    # --- 1. LEGS & BOOTS (Curved silhouette) ---
    l_step = 0
    r_step = 0
    if direction in ["side", "left"]:
        if frame == 1: l_step = 4; r_step = -4
        elif frame == 3: l_step = -4; r_step = 4
    elif direction in ["down", "up"]:
        if frame == 1: l_step = -2
        elif frame == 3: r_step = -2

    # Left Leg (Tapered, rounded knee and boot)
    circle(24 + l_step, 54 - bob, 4, "pants_l")
    circle(24 + l_step, 61 - bob, 4, "pants_d")
    # Boot
    for y in range(65 - bob, 75):
        w_spread = (y - (65 - bob)) // 3
        h_line(20 + l_step - w_spread, 27 + l_step + w_spread, y, "boot_l")
    h_line(18 + l_step, 29 + l_step, 75, "boot_d") # Sole

    # Right Leg
    circle(38 + r_step, 54 - bob, 4, "pants_l")
    circle(38 + r_step, 61 - bob, 4, "pants_d")
    # Boot
    for y in range(65 - bob, 75):
        w_spread = (y - (65 - bob)) // 3
        h_line(34 + r_step - w_spread, 41 + r_step + w_spread, y, "boot_l")
    h_line(32 + r_step, 43 + r_step, 75, "boot_d") # Sole

    # --- 2. TORSO / FUFAYKA (Padded, round shoulders, waist belt) ---
    torso_cy = 38 - bob
    # Rounded torso oval
    for dy in range(-12, 13):
        half_w = int(14 * (1.0 - (dy / 16.0)**2)**0.5)
        h_line(31 - half_w, 31 + half_w, torso_cy + dy, "fuf_m")
        # Stitching lines
        if (torso_cy + dy) % 3 == 0:
            for sx in [24, 31, 38]:
                if 31 - half_w < sx < 31 + half_w:
                    set_px(sx, torso_cy + dy, "stitch")

    # Scarf collar around neck (curved torus)
    for dy in range(-4, 5):
        hw = int(12 * (1.0 - (dy / 6.0)**2)**0.5)
        h_line(31 - hw, 31 + hw, 26 + dy - bob, "scarf")

    # Leather belt
    for dy in [9, 10, 11]:
        h_line(19, 43, torso_cy + dy, "belt")
    if direction != "up":
        # Brass buckle
        for dy in [8, 9, 10, 11, 12]:
            h_line(29, 33, torso_cy + dy, "buckle")

    # Canvas Bag across shoulder (diagonal strap and round pouch)
    if direction in ["down", "side"]:
        circle(43, 44 - bob, 7, "bag")
        for i in range(16):
            set_px(22 + i, 24 + i - bob, "belt")
            set_px(23 + i, 24 + i - bob, "belt")
    elif direction == "up":
        circle(41, 42 - bob, 7, "bag")
        for i in range(16):
            set_px(22 + i, 24 + i - bob, "belt")

    # --- 3. HEAD & USHANKA (Rounded, curved ear flaps, face features) ---
    head_cy = 15 - bob

    if direction == "down":
        # Face (Oval)
        for dy in range(-2, 10):
            hw = int(9 * (1.0 - (dy / 12.0)**2)**0.5)
            h_line(31 - hw, 31 + hw, head_cy + dy, "skin_l")

        # Stubble Beard (rounded jaw)
        for dy in range(4, 10):
            hw = int(8 * (1.0 - (dy / 11.0)**2)**0.5)
            h_line(31 - hw, 31 + hw, head_cy + dy, "beard")

        # Eyes & Nose
        set_px(26, head_cy + 2, "out")
        set_px(27, head_cy + 2, "out")
        set_px(35, head_cy + 2, "out")
        set_px(36, head_cy + 2, "out")
        # Nose shadow
        set_px(31, head_cy + 4, "skin_d")
        set_px(31, head_cy + 5, "skin_d")

        # Ushanka Crown (Smooth dome)
        for dy in range(-11, 0):
            hw = int(13 * (1.0 - (dy / 13.0)**2)**0.5)
            h_line(31 - hw, 31 + hw, head_cy + dy, "fur_m")

        # Front Flap (curved rectangle)
        for dy in range(-3, 2):
            h_line(23, 39, head_cy + dy, "fur_l")

        # Red Soviet Star
        star_pts = [(31, head_cy - 2), (30, head_cy - 1), (31, head_cy - 1), (32, head_cy - 1),
                    (29, head_cy), (30, head_cy), (31, head_cy), (32, head_cy), (33, head_cy),
                    (30, head_cy + 1), (32, head_cy + 1)]
        for sx, sy in star_pts:
            set_px(sx, sy, "star")

        # Curved Hanging Ear Flaps (Left & Right)
        for dy in range(-2, 12):
            h_line(17, 21, head_cy + dy, "fur_d")
            h_line(41, 45, head_cy + dy, "fur_d")
        circle(19, head_cy + 11, 2, "fur_d")
        circle(43, head_cy + 11, 2, "fur_d")

    elif direction == "up":
        # Back of Ushanka (Round dome covering neck)
        for dy in range(-11, 8):
            hw = int(14 * (1.0 - (dy / 14.0)**2)**0.5)
            h_line(31 - hw, 31 + hw, head_cy + dy, "fur_m")
        for dy in range(-2, 11):
            h_line(17, 21, head_cy + dy, "fur_d")
            h_line(41, 45, head_cy + dy, "fur_d")

    elif direction in ["side", "left"]:
        # 3/4 Profile Face (Nose profile and brow)
        for dy in range(-2, 9):
            hw = int(9 * (1.0 - (dy / 11.0)**2)**0.5)
            h_line(31 - hw + 2, 31 + hw + 2, head_cy + dy, "skin_l")

        # Beard & nose
        for dy in range(4, 9):
            h_line(26, 40, head_cy + dy, "beard")
        set_px(39, head_cy + 3, "skin_m") # Nose bridge
        set_px(40, head_cy + 4, "skin_m") # Nose tip
        set_px(34, head_cy + 2, "out")    # Eye

        # Ushanka dome
        for dy in range(-11, 0):
            hw = int(13 * (1.0 - (dy / 13.0)**2)**0.5)
            h_line(31 - hw, 31 + hw, head_cy + dy, "fur_m")
        # Front flap
        for dy in range(-3, 2):
            h_line(32, 42, head_cy + dy, "fur_l")
        set_px(36, head_cy - 1, "star")
        # Side ear flap
        for dy in range(-2, 12):
            h_line(22, 28, head_cy + dy, "fur_d")
        circle(25, head_cy + 11, 3, "fur_d")

    # --- 4. ARMS AND WEAPON (Round sleeves and detailed sawed-off shotgun) ---
    if direction == "down":
        # Rounded Arms
        circle(15, 32 - bob, 4, "fuf_l")
        circle(14, 38 - bob, 3, "fuf_m")
        circle(14, 43 - bob, 3, "skin_m") # Left hand

        circle(47, 32 - bob, 4, "fuf_l")
        circle(48, 38 - bob, 3, "fuf_m")
        circle(48, 43 - bob, 3, "skin_m") # Right hand

        # Shotgun across front
        # Wooden stock
        for dy in [-1, 0, 1]:
            h_line(22, 29, 41 + dy - bob, "wood_l")
        # Barrels
        for dy in [-2, -1, 0, 1]:
            h_line(30, 48, 41 + dy - bob, "metal_m")
        # Tape wrapping
        for dy in [-2, -1, 0, 1]:
            h_line(37, 39, 41 + dy - bob, "tape")

    elif direction == "up":
        circle(15, 32 - bob, 4, "fuf_l")
        circle(14, 38 - bob, 3, "fuf_m")
        circle(47, 32 - bob, 4, "fuf_l")
        circle(48, 38 - bob, 3, "fuf_m")
        # Barrel tip peeking
        h_line(10, 14, 35 - bob, "metal_m")

    elif direction == "side":
        # Shoulders & Arm aiming right
        circle(26, 32 - bob, 5, "fuf_l")
        for dy in [-2, -1, 0, 1, 2]:
            h_line(30, 40, 36 + dy - bob, "fuf_m")
        circle(41, 36 - bob, 3, "skin_m") # Hand grip

        # Sawed-off shotgun (Wood curve, double barrel, tape wrap)
        for dy in [-2, -1, 0, 1, 2]:
            h_line(28, 37, 39 + dy - bob, "wood_l")
        for dy in [-2, -1, 0, 1]:
            h_line(38, 56, 38 + dy - bob, "metal_m")
        # Barrel top reflection
        h_line(38, 56, 37 - bob, "metal_l")
        # Tape wrapping bands
        for dy in [-2, -1, 0, 1]:
            h_line(44, 46, 38 + dy - bob, "tape")
            h_line(50, 52, 38 + dy - bob, "tape")

    # Add dark comic contour around non-empty pixels
    temp = img.copy()
    temp_px = temp.load()
    for y in range(H):
        for x in range(W):
            if temp_px[x, y][3] == 0:
                # Check neighbors
                has_solid = False
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and temp_px[nx, ny][3] > 0:
                        has_solid = True
                        break
                if has_solid:
                    set_px(x, y, "out")

    if direction == "left":
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    return img

def render_organic_character():
    out_dir = "assets/sprites/vasiliy_pixel/anims"
    os.makedirs(out_dir, exist_ok=True)

    dirs = ["down", "up", "side", "left"]
    for d in dirs:
        for f in range(4):
            sprite = draw_organic_pixel_vasiliy(d, f)
            # Scale 3x to 192x240 for high-detail crisp rendering
            scaled = sprite.resize((192, 240), Image.NEAREST)
            out_path = os.path.join(out_dir, f"vasiliy_{d}_{f}.png")
            scaled.save(out_path)
            print(f"Generated smooth organic pixel sprite: {out_path}")

    print("\nAll smooth organic pixel sprites generated successfully!")

if __name__ == "__main__":
    render_organic_character()
