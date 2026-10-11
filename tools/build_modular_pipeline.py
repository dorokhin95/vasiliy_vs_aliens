import os
from PIL import Image, ImageDraw
import numpy as np

def run_pipeline():
    anims_dir = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_pixel\anims"
    weapons_dir = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_pixel\weapons"
    gear_dir = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy"

    os.makedirs(anims_dir, exist_ok=True)
    os.makedirs(weapons_dir, exist_ok=True)
    os.makedirs(gear_dir, exist_ok=True)

    # ----------------------------------------------------
    # 1. CLEAN BASE SPRITES (NO BAKED WEAPONS)
    # ----------------------------------------------------
    # Load polished clean base
    clean_base = Image.open(r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\test_clean_vasiliy_polished.png")
    c_arr = np.array(clean_base)

    # Additional cleanup on left sleeve (our right side)
    # Add a natural sleeve fold so the arm rests naturally
    for y in range(125, 155):
        for x in range(126, 134):
            # Fill with jacket dark fold color
            if y < 145:
                c_arr[y, x] = [45, 48, 38, 255]
            else:
                c_arr[y, x] = [30, 28, 24, 255]
    # Edge outline
    for y in range(124, 156):
        c_arr[y, 134] = [20, 20, 20, 255]

    clean_down_0 = Image.fromarray(c_arr)

    # Generate 4 walking frames for DOWN direction by applying leg/boot step cycle
    orig_down_frames = [
        Image.open(os.path.join(anims_dir, f"vasiliy_down_{i}.png")) for i in range(4)
    ]

    for i in range(4):
        # Base starts from clean upper torso
        f_img = clean_down_0.copy()
        f_arr = np.array(f_img)
        orig_f_arr = np.array(orig_down_frames[i])

        # Copy the leg/walking animation from the original frame (y >= 165)
        # because the legs were already perfectly animated for walking!
        f_arr[165:, :] = orig_f_arr[165:, :]

        # Save clean walking frame
        out_f = Image.fromarray(f_arr)
        out_f.save(os.path.join(anims_dir, f"vasiliy_down_{i}.png"))
        print(f"Saved clean anim: vasiliy_down_{i}.png")

    # For UP direction: clean up the small barrel tip poking over left shoulder in orig up frames
    orig_up_frames = [
        Image.open(os.path.join(anims_dir, f"vasiliy_up_{i}.png")) for i in range(4)
    ]
    for i in range(4):
        up_arr = np.array(orig_up_frames[i])
        # Gun barrel poke is at x: 25..50, y: 70..105 (over shoulder)
        for y in range(70, 105):
            for x in range(25, 50):
                r, g, b, a = up_arr[y, x]
                if a > 0 and r < 60 and g < 60 and b < 60:
                    # Clear out the barrel tip poking above coat
                    up_arr[y, x] = [0, 0, 0, 0]
        out_up = Image.fromarray(up_arr)
        out_up.save(os.path.join(anims_dir, f"vasiliy_up_{i}.png"))
        print(f"Saved clean anim: vasiliy_up_{i}.png")

    # For SIDE and LEFT directions:
    for i in range(4):
        clean_down_0.save(os.path.join(anims_dir, f"vasiliy_side_{i}.png"))
        flipped = clean_down_0.transpose(Image.FLIP_LEFT_RIGHT)
        flipped.save(os.path.join(anims_dir, f"vasiliy_left_{i}.png"))
        print(f"Saved clean anim: vasiliy_side_{i}.png & left_{i}.png")

    # ----------------------------------------------------
    # 2. HIGH-QUALITY GRITTY WEAPON SPRITES
    # ----------------------------------------------------
    # A) SAWED-OFF DOUBLE-BARREL SHOTGUN
    shotgun_w, shotgun_h = 100, 30
    sg_arr = np.zeros((shotgun_h, shotgun_w, 4), dtype=np.uint8)

    # Wooden curved grip
    wood_dark = [70, 38, 20, 255]
    wood_mid = [115, 62, 32, 255]
    wood_light = [150, 85, 45, 255]
    metal_dark = [40, 42, 46, 255]
    metal_mid = [85, 90, 98, 255]
    metal_light = [140, 145, 155, 255]
    tape_col = [185, 175, 150, 255]
    outline = [18, 18, 20, 255]

    # Draw wood stock / grip (x: 5..28, y: 10..24)
    for x in range(6, 28):
        for y in range(12, 22):
            sg_arr[y, x] = wood_mid
    # Wood grip angle
    for x in range(6, 16):
        for y in range(16, 26):
            sg_arr[y, x] = wood_dark
    for x in range(10, 26):
        sg_arr[13, x] = wood_light

    # Steel receiver & trigger guard (x: 28..45, y: 10..22)
    for x in range(28, 46):
        for y in range(11, 20):
            sg_arr[y, x] = metal_mid
    for x in range(30, 44):
        sg_arr[12, x] = metal_light
    for x in range(32, 40):
        sg_arr[19, x] = metal_dark # trigger guard

    # Double steel barrels (x: 46..92, y: 10..18)
    for x in range(46, 92):
        for y in range(11, 18):
            sg_arr[y, x] = metal_mid
        sg_arr[12, x] = metal_light # top barrel highlight
        sg_arr[15, x] = metal_dark  # between-barrel groove
        sg_arr[16, x] = metal_light # lower barrel highlight

    # Front sight bead
    sg_arr[9, 90] = metal_light
    sg_arr[9, 91] = metal_light

    # Weathered electrical tape wraps
    for tx in [55, 56, 57, 72, 73, 74]:
        for y in range(10, 19):
            sg_arr[y, tx] = tape_col

    # Black pixel outline
    temp_sg = sg_arr.copy()
    for y in range(shotgun_h):
        for x in range(shotgun_w):
            if temp_sg[y, x, 3] == 0:
                has_neighbor = False
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < shotgun_w and 0 <= ny < shotgun_h and temp_sg[ny, nx, 3] > 0:
                            has_neighbor = True
                            break
                if has_neighbor:
                    sg_arr[y, x] = outline

    sg_img = Image.fromarray(sg_arr)
    sg_img.save(os.path.join(weapons_dir, "w_shotgun.png"))
    print("Saved high-detail sawed-off shotgun!")

    # B) INDUSTRIAL CYBER DRILL
    drill_w, drill_h = 100, 36
    dr_arr = np.zeros((drill_h, drill_w, 4), dtype=np.uint8)

    carbide_tip = [170, 180, 195, 255]
    carbide_mid = [105, 115, 130, 255]
    carbide_groove = [45, 50, 60, 255]
    cyan_glow = [0, 220, 255, 255]
    cyan_bright = [180, 255, 255, 255]
    heavy_steel = [55, 60, 68, 255]
    heavy_steel_light = [88, 95, 105, 255]

    # Heavy motor casing (x: 8..46, y: 8..28)
    for x in range(8, 46):
        for y in range(9, 27):
            dr_arr[y, x] = heavy_steel
        dr_arr[11, x] = heavy_steel_light

    # Cooling vents
    for vx in [14, 18, 22, 26]:
        for vy in range(13, 23):
            dr_arr[vy, vx] = [25, 28, 32, 255]

    # Cyan energy coil / battery cell in center (x: 30..42, y: 13..23)
    for x in range(30, 42):
        for y in range(14, 22):
            dr_arr[y, x] = cyan_glow
    for x in range(32, 40):
        dr_arr[16, x] = cyan_bright

    # Conical spiral drill bit (x: 46..92)
    # Tapers from diameter 20 down to diameter 2
    for x in range(46, 94):
        progress = (x - 46) / 48.0 # 0.0 to 1.0
        half_h = int(10 * (1.0 - progress * 0.85))
        cy = 18
        for y in range(cy - half_h, cy + half_h + 1):
            # Spiral flutes
            flute = int((x * 0.5 + y) % 6)
            if flute < 2:
                dr_arr[y, x] = carbide_groove
            elif flute < 4:
                dr_arr[y, x] = carbide_mid
            else:
                dr_arr[y, x] = carbide_tip

    # Black pixel outline for drill
    temp_dr = dr_arr.copy()
    for y in range(drill_h):
        for x in range(drill_w):
            if temp_dr[y, x, 3] == 0:
                has_n = False
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < drill_w and 0 <= ny < drill_h and temp_dr[ny, nx, 3] > 0:
                            has_n = True
                            break
                if has_n:
                    dr_arr[y, x] = outline

    dr_img = Image.fromarray(dr_arr)
    dr_img.save(os.path.join(weapons_dir, "w_drill.png"))
    print("Saved high-detail industrial cyber drill!")

    # C) HOMEMADE POST-APOCALYPTIC PLASMA CARBINE
    plasma_w, plasma_h = 105, 34
    pl_arr = np.zeros((plasma_h, plasma_w, 4), dtype=np.uint8)

    copper_col = [185, 105, 55, 255]
    green_core = [50, 255, 120, 255]
    green_bright = [210, 255, 220, 255]

    # Scrap metal body & grip (x: 6..42)
    for x in range(6, 42):
        for y in range(11, 23):
            pl_arr[y, x] = heavy_steel
        pl_arr[13, x] = heavy_steel_light
    # Pistol grip
    for x in range(10, 20):
        for y in range(21, 30):
            pl_arr[y, x] = wood_dark

    # Glass vacuum tube holding plasma core (x: 44..76, y: 10..24)
    for x in range(44, 76):
        for y in range(11, 23):
            pl_arr[y, x] = [40, 80, 60, 255]
        for y in range(14, 20):
            pl_arr[y, x] = green_core
        pl_arr[16, x] = green_bright

    # Copper magnetic accelerator coils around glass tube
    for cx in [48, 56, 64, 72]:
        for cy in range(9, 25):
            pl_arr[cy, cx] = copper_col

    # Focusing muzzle nozzle (x: 76..96, y: 13..21)
    for x in range(76, 96):
        for y in range(13, 21):
            pl_arr[y, x] = metal_mid
        pl_arr[14, x] = metal_light
    # Plasma emitter spark at tip
    pl_arr[16, 96] = green_bright
    pl_arr[17, 96] = green_bright

    # Black pixel outline for plasma
    temp_pl = pl_arr.copy()
    for y in range(plasma_h):
        for x in range(plasma_w):
            if temp_pl[y, x, 3] == 0:
                has_n = False
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < plasma_w and 0 <= ny < plasma_h and temp_pl[ny, nx, 3] > 0:
                            has_n = True
                            break
                if has_n:
                    pl_arr[y, x] = outline

    pl_img = Image.fromarray(pl_arr)
    pl_img.save(os.path.join(weapons_dir, "w_plasma.png"))
    print("Saved high-detail post-apoc plasma carbine!")

    # ----------------------------------------------------
    # 3. GEAR SPRITES (SOVIET RUG & TRUCK BATTERY)
    # ----------------------------------------------------
    # Soviet Carpet Cloak
    carpet_w, carpet_h = 80, 90
    carp_arr = np.zeros((carpet_h, carpet_w, 4), dtype=np.uint8)
    rug_red = [155, 32, 28, 255]
    rug_gold = [215, 165, 45, 255]
    rug_dark = [95, 20, 18, 255]
    rug_fringe = [230, 220, 190, 255]

    for y in range(8, 78):
        for x in range(10, 70):
            # Geometric Soviet oriental rug pattern
            pattern = (x + y) % 8 < 2 or (x - y) % 8 < 2 or (x % 12 < 2)
            if pattern:
                carp_arr[y, x] = rug_gold
            elif (y % 4 == 0):
                carp_arr[y, x] = rug_dark
            else:
                carp_arr[y, x] = rug_red

    # Bottom fringes
    for x in range(10, 70):
        if x % 2 == 0:
            for fy in range(78, 86):
                carp_arr[fy, x] = rug_fringe

    # Outline
    temp_c = carp_arr.copy()
    for y in range(carpet_h):
        for x in range(carpet_w):
            if temp_c[y, x, 3] == 0:
                has_n = False
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < carpet_w and 0 <= ny < carpet_h and temp_c[ny, nx, 3] > 0:
                            has_n = True
                            break
                if has_n:
                    carp_arr[y, x] = outline

    Image.fromarray(carp_arr).save(os.path.join(gear_dir, "gear_soviet_carpet.png"))
    print("Saved high-detail Soviet rug cloak!")

    # KAMAZ Truck Battery Pack
    bat_w, bat_h = 70, 70
    bat_arr = np.zeros((bat_h, bat_w, 4), dtype=np.uint8)
    bat_case = [35, 38, 42, 255]
    bat_case_light = [65, 70, 78, 255]
    lead_term = [160, 165, 175, 255]
    acid_yellow = [240, 200, 30, 255]

    for y in range(18, 62):
        for x in range(12, 58):
            bat_arr[y, x] = bat_case
        bat_arr[20, x] = bat_case_light

    # Battery cells caps (6 caps across top)
    for cx in [16, 23, 30, 37, 44, 51]:
        for cy in range(13, 19):
            bat_arr[cy, cx] = acid_yellow
            bat_arr[cy, cx + 1] = acid_yellow

    # Positive & Negative lead terminals with wires
    for ty in range(8, 14):
        bat_arr[ty, 15] = [220, 40, 30, 255] # Red +
        bat_arr[ty, 53] = [30, 40, 220, 255] # Blue -

    temp_b = bat_arr.copy()
    for y in range(bat_h):
        for x in range(bat_w):
            if temp_b[y, x, 3] == 0:
                has_n = False
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < bat_w and 0 <= ny < bat_h and temp_b[ny, nx, 3] > 0:
                            has_n = True
                            break
                if has_n:
                    bat_arr[y, x] = outline

    Image.fromarray(bat_arr).save(os.path.join(gear_dir, "gear_car_battery.png"))
    print("Saved high-detail KAMAZ truck battery!")

    print("\nALL ASSETS CREATED SUCCESSFULLY!")

if __name__ == "__main__":
    run_pipeline()
