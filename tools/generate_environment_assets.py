import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
import math

os.makedirs('assets/textures', exist_ok=True)
os.makedirs('assets/sprites/props', exist_ok=True)
os.makedirs('assets/sprites/buildings', exist_ok=True)

# -------------------------------------------------------------
# 1. SEAMLESS ASPHALT ROAD TEXTURE (256x256)
# -------------------------------------------------------------
def generate_asphalt():
    w, h = 256, 256
    np.random.seed(101)
    
    # Base dark asphalt tones
    base = np.full((h, w, 3), [32, 36, 44], dtype=np.float32)
    
    # Multi-frequency noise with toroidal seamless wrapping
    n_fine = np.random.uniform(0.85, 1.15, (h, w, 1))
    
    # Seamless medium aggregate
    small = np.random.uniform(0.75, 1.25, (32, 32))
    small = np.tile(small, (8, 8))
    small = cv2.GaussianBlur(small, (15, 15), 0)[:, :, np.newaxis]
    
    asphalt = base * n_fine * small
    
    # Add gravel specks
    for _ in range(800):
        gx = np.random.randint(0, w)
        gy = np.random.randint(0, h)
        gr_col = np.random.choice([25, 45, 60, 80])
        asphalt[gy, gx] = [gr_col, gr_col + 2, gr_col + 5]
        
    # Dark tar patches (pothole repairs)
    for _ in range(3):
        tx = np.random.randint(20, w - 20)
        ty = np.random.randint(20, h - 20)
        tw = np.random.randint(18, 38)
        th = np.random.randint(12, 26)
        tar_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.ellipse(tar_mask, (tx, ty), (tw, th), np.random.randint(0, 180), 0, 360, 255, -1)
        tar_mask = cv2.GaussianBlur(tar_mask, (7, 7), 0).astype(np.float32) / 255.0
        tar_color = np.array([20, 22, 26], dtype=np.float32)
        for c in range(3):
            asphalt[:, :, c] = asphalt[:, :, c] * (1.0 - tar_mask * 0.7) + tar_color[c] * (tar_mask * 0.7)
            
    asphalt = np.clip(asphalt, 0, 255).astype(np.uint8)
    Image.fromarray(asphalt).save('assets/textures/asphalt_road.png')
    print("Generated: assets/textures/asphalt_road.png")

# -------------------------------------------------------------
# 2. SEAMLESS WASTELAND TERRAIN TEXTURE (256x256)
# -------------------------------------------------------------
def generate_ground_terrain():
    w, h = 256, 256
    np.random.seed(202)
    
    # Muddy dark soil base [22, 26, 28] with olive-brown dirt patches
    soil_base = np.full((h, w, 3), [24, 27, 30], dtype=np.float32)
    
    # Seamless organic patches
    low_res = np.random.uniform(0.6, 1.4, (16, 16))
    low_tile = cv2.GaussianBlur(np.tile(low_res, (16, 16)), (25, 25), 0)[:, :, np.newaxis]
    
    fine_noise = np.random.uniform(0.85, 1.15, (h, w, 1))
    terrain = soil_base * low_tile * fine_noise
    
    # Patches of sickly dried moss / dark weeds
    weed_color = np.array([32, 42, 28], dtype=np.float32)
    weed_noise = cv2.GaussianBlur(np.tile(np.random.uniform(0, 1, (32, 32)), (8, 8)), (19, 19), 0)
    weed_mask = np.clip((weed_noise - 0.48) * 3.5, 0, 1)[:, :, np.newaxis]
    terrain = terrain * (1.0 - weed_mask * 0.65) + weed_color * (weed_mask * 0.65)
    
    # Gravel & crushed stone debris
    for _ in range(600):
        rx = np.random.randint(0, w)
        ry = np.random.randint(0, h)
        sc = np.random.randint(35, 65)
        terrain[ry, rx] = [sc - 5, sc, sc + 8]
        
    terrain = np.clip(terrain, 0, 255).astype(np.uint8)
    Image.fromarray(terrain).save('assets/textures/ground_terrain.png')
    print("Generated: assets/textures/ground_terrain.png")

# -------------------------------------------------------------
# 3. SEAMLESS SIDEWALK CONCRETE TILES (128x128)
# -------------------------------------------------------------
def generate_sidewalk_tiles():
    w, h = 128, 128
    tile_size = 32
    canvas = np.full((h, w, 3), [46, 52, 60], dtype=np.float32)
    
    np.random.seed(303)
    noise = np.random.uniform(0.90, 1.10, (h, w, 1))
    canvas *= noise
    
    # Tile seam grid (dark grooved expansion joints)
    seam_color = np.array([22, 25, 30], dtype=np.float32)
    for x in range(0, w, tile_size):
        canvas[:, max(0, x-1):min(w, x+1)] = seam_color
    for y in range(0, h, tile_size):
        canvas[max(0, y-1):min(h, y+1), :] = seam_color
        
    # Subtle bevel shading on each tile
    for tx in range(0, w, tile_size):
        for ty in range(0, h, tile_size):
            # Top-left highlight
            canvas[ty+1:ty+3, tx+1:tx+tile_size-2] += 8
            canvas[ty+1:ty+tile_size-2, tx+1:tx+3] += 8
            # Bottom-right shadow
            canvas[ty+tile_size-3:ty+tile_size-1, tx+2:tx+tile_size-1] -= 8
            canvas[ty+2:ty+tile_size-1, tx+tile_size-3:tx+tile_size-1] -= 8
            
    canvas = np.clip(canvas, 0, 255).astype(np.uint8)
    Image.fromarray(canvas).save('assets/textures/sidewalk_tiles.png')
    print("Generated: assets/textures/sidewalk_tiles.png")

# -------------------------------------------------------------
# 4. CAST IRON MANHOLE COVER (64x64 RGBA)
# -------------------------------------------------------------
def generate_manhole():
    size = 64
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    cx, cy = size // 2, size // 2
    r = 28
    
    # Outer dark rim
    draw.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=(20, 22, 26, 255))
    # Outer cast-iron ring
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(42, 46, 52, 255), outline=(65, 70, 78, 255), width=2)
    # Concentric rib rings
    for cr in [22, 16, 10]:
        draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], outline=(30, 33, 38, 255), width=2)
        
    # Radial ribs (GOST hatch pattern)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        x1 = cx + math.cos(rad) * 11
        y1 = cy + math.sin(rad) * 11
        x2 = cx + math.cos(rad) * 26
        y2 = cy + math.sin(rad) * 26
        draw.line([x1, y1, x2, y2], fill=(60, 65, 72, 255), width=2)
        
    # Center relief
    draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(70, 75, 84, 255), outline=(25, 28, 32, 255), width=1)
    im.save('assets/sprites/props/manhole_cover.png')
    print("Generated: assets/sprites/props/manhole_cover.png")

# -------------------------------------------------------------
# 5. RAIN PUDDLE WITH OILY RAINBOW SHEEN (128x80 RGBA)
# -------------------------------------------------------------
def generate_puddle():
    w, h = 128, 80
    cx, cy = w // 2, h // 2
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    
    Y, X = np.mgrid[:h, :w]
    # Irregular organic puddle shape
    angle = np.arctan2(Y - cy, X - cx)
    dist = np.hypot(X - cx, (Y - cy) * 1.6)
    noise_r = 44 + 6 * np.sin(angle * 3) + 4 * np.cos(angle * 5)
    
    inside = dist < noise_r
    edge_dist = np.clip((noise_r - dist) / 8.0, 0, 1)
    
    # Dark reflective water
    arr[inside, 0] = 16
    arr[inside, 1] = 20
    arr[inside, 2] = 26
    arr[inside, 3] = (edge_dist[inside] * 190).astype(np.uint8)
    
    # Rainbow petroleum film in center
    oil_mask = dist < (noise_r * 0.65)
    oil_phase = (X[oil_mask] * 0.12 + Y[oil_mask] * 0.08)
    arr[oil_mask, 0] = np.clip(arr[oil_mask, 0] + np.sin(oil_phase) * 35 + 20, 0, 255).astype(np.uint8)
    arr[oil_mask, 1] = np.clip(arr[oil_mask, 1] + np.sin(oil_phase + 2.1) * 45 + 30, 0, 255).astype(np.uint8)
    arr[oil_mask, 2] = np.clip(arr[oil_mask, 2] + np.sin(oil_phase + 4.2) * 55 + 40, 0, 255).astype(np.uint8)
    
    Image.fromarray(arr).save('assets/sprites/props/puddle.png')
    print("Generated: assets/sprites/props/puddle.png")

# -------------------------------------------------------------
# 6. WRECKED SOVIET LADA ZHIGULI CAR (96x52 RGBA 2.5D)
# -------------------------------------------------------------
def generate_car_zhiguli():
    w, h = 96, 52
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    # Drop shadow
    draw.ellipse([8, 12, 88, 50], fill=(0, 0, 0, 130))
    
    # Car body (Rusty cherry-red / faded wine VAZ 2101 / 2105)
    # Main hull rectangle with rounded corners
    body_col = (118, 42, 38, 255) # Faded red
    rim_col = (75, 24, 22, 255)
    draw.rounded_rectangle([12, 10, 84, 42], radius=6, fill=body_col, outline=rim_col, width=2)
    
    # Front hood (left side = front of car)
    draw.rectangle([14, 12, 34, 40], fill=(135, 48, 42, 255))
    # Crumpled dent on hood
    draw.polygon([(18, 14), (28, 20), (22, 32), (15, 28)], fill=(85, 32, 28, 255))
    # Rust patches
    draw.ellipse([22, 16, 30, 24], fill=(95, 52, 28, 255))
    draw.ellipse([64, 30, 76, 38], fill=(90, 48, 26, 255))
    
    # Windshield (cracked / spiderweb)
    draw.polygon([(36, 14), (44, 16), (44, 36), (36, 38)], fill=(38, 52, 64, 255), outline=(80, 110, 130, 255))
    draw.line([(38, 18), (42, 32)], fill=(180, 210, 230, 255), width=1)
    draw.line([(36, 26), (43, 24)], fill=(180, 210, 230, 255), width=1)
    
    # Roof (raised cabin)
    draw.rectangle([44, 14, 66, 38], fill=(105, 38, 34, 255), outline=rim_col, width=1)
    # Rear window
    draw.polygon([(66, 15), (72, 17), (72, 35), (66, 37)], fill=(32, 44, 54, 255), outline=(60, 85, 105, 255))
    # Trunk
    draw.rectangle([72, 13, 82, 39], fill=(125, 44, 40, 255))
    
    # Chrome bumpers (tarnished / bent)
    draw.rectangle([10, 14, 13, 38], fill=(140, 145, 150, 255), outline=(50, 52, 55, 255))
    draw.rectangle([83, 15, 86, 37], fill=(130, 135, 140, 255), outline=(50, 52, 55, 255))
    
    # Headlights (one broken, one amber glass)
    draw.ellipse([11, 16, 14, 22], fill=(220, 200, 110, 255)) # Yellow lens
    draw.ellipse([11, 30, 14, 36], fill=(50, 40, 35, 255)) # Smashed dark socket
    
    # Wheels (flat tires sticking out)
    draw.rectangle([24, 7, 34, 11], fill=(25, 25, 28, 255))
    draw.rectangle([62, 7, 72, 11], fill=(25, 25, 28, 255))
    draw.rectangle([24, 41, 34, 45], fill=(25, 25, 28, 255))
    draw.rectangle([62, 41, 72, 45], fill=(25, 25, 28, 255))
    
    im.save('assets/sprites/props/car_zhiguli.png')
    print("Generated: assets/sprites/props/car_zhiguli.png")

# -------------------------------------------------------------
# 7. WRECKED SOVIET UAZ BUKHANKA VAN (104x56 RGBA 2.5D)
# -------------------------------------------------------------
def generate_car_uaz():
    w, h = 104, 56
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    # Drop shadow
    draw.ellipse([10, 14, 98, 54], fill=(0, 0, 0, 140))
    
    # Khaki / Military ambulance van body
    van_col = (58, 68, 52, 255) # Protective olive
    rim_col = (35, 42, 32, 255)
    draw.rounded_rectangle([14, 10, 92, 46], radius=8, fill=van_col, outline=rim_col, width=2)
    
    # Rounded cab nose (Bukhanka signature front)
    draw.ellipse([12, 12, 28, 44], fill=(64, 74, 56, 255), outline=rim_col, width=1)
    
    # Windshield dual curved panels
    draw.polygon([(24, 14), (32, 16), (32, 26), (24, 26)], fill=(32, 45, 55, 255), outline=(70, 95, 115, 255))
    draw.polygon([(24, 30), (32, 30), (32, 40), (24, 42)], fill=(32, 45, 55, 255), outline=(70, 95, 115, 255))
    
    # Roof ribs (signature corrugated roof of UAZ)
    for rx in range(36, 84, 8):
        draw.line([(rx, 14), (rx, 42)], fill=(48, 56, 44, 255), width=2)
        draw.line([(rx+1, 14), (rx+1, 42)], fill=(75, 88, 68, 255), width=1)
        
    # Faded red cross on roof (Sanitary / Ambulance)
    draw.rectangle([54, 24, 66, 32], fill=(130, 42, 38, 200))
    draw.rectangle([58, 20, 62, 36], fill=(130, 42, 38, 200))
    
    # Rust streaks & bullet dents
    draw.ellipse([38, 34, 46, 42], fill=(85, 52, 28, 255))
    draw.ellipse([74, 14, 84, 22], fill=(85, 52, 28, 255))
    # Bullet holes
    for bx, by in [(30, 22), (34, 24), (70, 28), (73, 26)]:
        draw.ellipse([bx-2, by-2, bx+2, by+2], fill=(18, 18, 18, 255), outline=(130, 130, 130, 255))
        
    # Wheels
    draw.rectangle([28, 6, 40, 11], fill=(22, 22, 24, 255))
    draw.rectangle([68, 6, 80, 11], fill=(22, 22, 24, 255))
    draw.rectangle([28, 45, 40, 50], fill=(22, 22, 24, 255))
    draw.rectangle([68, 45, 80, 50], fill=(22, 22, 24, 255))
    
    im.save('assets/sprites/props/car_uaz.png')
    print("Generated: assets/sprites/props/car_uaz.png")

# -------------------------------------------------------------
# 8. SOVIET METAL TRASH DUMPSTER (52x52 RGBA 2.5D)
# -------------------------------------------------------------
def generate_trash_dumpster():
    w, h = 52, 52
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    # Drop shadow
    draw.ellipse([6, 12, 48, 48], fill=(0, 0, 0, 140))
    
    # Skewed trapezoid metal dumpster body (classic Soviet municipal bin)
    body_pts = [(10, 12), (42, 12), (46, 42), (6, 42)]
    draw.polygon(body_pts, fill=(45, 62, 48, 255), outline=(26, 36, 28, 255)) # Peeling green paint
    
    # Top rim opening
    draw.polygon([(10, 10), (42, 10), (44, 18), (8, 18)], fill=(32, 44, 34, 255), outline=(18, 24, 20, 255), width=2)
    # Dark interior opening
    draw.polygon([(12, 12), (40, 12), (42, 16), (10, 16)], fill=(14, 16, 15, 255))
    
    # Cardboard boxes & black garbage bags spilling out
    draw.rectangle([14, 8, 24, 15], fill=(130, 95, 55, 255), outline=(85, 60, 32, 255)) # Box
    draw.ellipse([25, 6, 36, 16], fill=(22, 22, 25, 255), outline=(45, 45, 52, 255)) # Black trash bag
    draw.polygon([(34, 10), (42, 9), (41, 15), (35, 16)], fill=(185, 180, 165, 255)) # Newspaper
    
    # Rust along bottom edge and weld corners
    draw.polygon([(6, 36), (46, 36), (46, 42), (6, 42)], fill=(92, 52, 28, 255))
    draw.line([(6, 42), (10, 12)], fill=(75, 42, 22, 255), width=2)
    draw.line([(46, 42), (42, 12)], fill=(75, 42, 22, 255), width=2)
    
    im.save('assets/sprites/props/trash_dumpster.png')
    print("Generated: assets/sprites/props/trash_dumpster.png")

# -------------------------------------------------------------
# 9. SOVIET MILITARY AMMO CRATE (48x40 RGBA 2.5D)
# -------------------------------------------------------------
def generate_military_crate():
    w, h = 48, 40
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    # Drop shadow
    draw.ellipse([4, 10, 44, 38], fill=(0, 0, 0, 135))
    
    # Heavy wooden crate in olive-drab
    wood_col = (68, 76, 52, 255)
    draw.rectangle([8, 8, 40, 32], fill=wood_col, outline=(42, 48, 32, 255), width=2)
    
    # Wooden planks
    draw.line([(8, 16), (40, 16)], fill=(52, 58, 38, 255), width=1)
    draw.line([(8, 24), (40, 24)], fill=(52, 58, 38, 255), width=1)
    
    # Steel reinforcement brackets on corners
    steel_col = (42, 45, 48, 255)
    rivet_col = (140, 145, 150, 255)
    for cx, cy in [(8, 8), (36, 8), (8, 28), (36, 28)]:
        draw.rectangle([cx, cy, cx + 4, cy + 4], fill=steel_col)
        draw.rectangle([cx+1, cy+1, cx+2, cy+2], fill=rivet_col)
        
    # Heavy metal latch & lock in center
    draw.rectangle([22, 18, 26, 25], fill=steel_col, outline=(20, 22, 24, 255))
    draw.ellipse([23, 22, 25, 26], fill=(160, 130, 45, 255)) # Brass padlock
    
    # Stenciled yellow military serial marking
    draw.text((12, 10), "7.62x54", fill=(160, 150, 60, 220))
    
    im.save('assets/sprites/props/military_crate.png')
    print("Generated: assets/sprites/props/military_crate.png")

# -------------------------------------------------------------
# 10. MIKHALYCH'S 24H SAFE ZONE STORE (200x150 RGBA 2.5D)
# -------------------------------------------------------------
def generate_mikhalyh_shop():
    w, h = 200, 150
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    # Large soft drop shadow
    draw.ellipse([10, 40, 190, 146], fill=(0, 0, 0, 150))
    
    # Pavillion structure (2.5D with visible roof)
    # 1. Main building walls (brick & concrete panels)
    draw.rectangle([25, 35, 175, 125], fill=(52, 60, 72, 255), outline=(32, 38, 48, 255), width=2)
    
    # 2. Roof with corrugated iron & tar edging
    roof_pts = [(20, 35), (180, 35), (170, 15), (30, 15)]
    draw.polygon(roof_pts, fill=(38, 44, 52, 255), outline=(22, 26, 32, 255))
    # Corrugated roof ribs
    for rx in range(35, 165, 8):
        draw.line([(rx, 35), (int(rx * 0.94 + 5), 15)], fill=(55, 62, 72, 255), width=1)
        
    # AC Unit on roof
    draw.rectangle([130, 18, 155, 30], fill=(70, 75, 82, 255), outline=(35, 38, 42, 255))
    draw.ellipse([134, 20, 142, 28], fill=(30, 32, 36, 255)) # Fan grille
    
    # 3. Large glowing glass shopfront window
    win_box = [35, 52, 165, 115]
    draw.rectangle(win_box, fill=(28, 48, 56, 255), outline=(60, 80, 95, 255), width=2)
    # Warm golden interior light gradient
    draw.rectangle([40, 56, 160, 110], fill=(165, 130, 50, 180))
    # Shelves with canned stew (тушенка) & bottles
    draw.line([(40, 75), (160, 75)], fill=(45, 35, 20, 255), width=2)
    draw.line([(40, 95), (160, 95)], fill=(45, 35, 20, 255), width=2)
    # Cans & bottles on shelves
    for sx in range(45, 155, 12):
        draw.rectangle([sx, 63, sx + 6, 74], fill=(180, 50, 45, 255)) # Red tin cans
        draw.rectangle([sx + 6, 83, sx + 10, 94], fill=(45, 140, 60, 255)) # Green vodka bottles
        
    # Window steel security bars
    for bx in range(45, 160, 16):
        draw.line([(bx, 52), (bx, 115)], fill=(35, 40, 48, 255), width=2)
        
    # 4. Front fortified entrance door with sandbags
    door_box = [88, 70, 116, 125]
    draw.rectangle(door_box, fill=(35, 38, 44, 255), outline=(20, 22, 26, 255), width=2)
    draw.rectangle([94, 76, 110, 95], fill=(70, 100, 120, 220)) # Small eye-slit window with cross-tape
    draw.line([(94, 76), (110, 95)], fill=(180, 180, 180, 255), width=1)
    draw.line([(110, 76), (94, 95)], fill=(180, 180, 180, 255), width=1)
    
    # Sandbag barricade flanking the entrance
    sandbag_col = (145, 125, 85, 255)
    sandbag_rim = (85, 72, 48, 255)
    for sb_x in [30, 48, 66, 135, 153]:
        draw.rounded_rectangle([sb_x, 116, sb_x + 18, 126], radius=3, fill=sandbag_col, outline=sandbag_rim)
        draw.rounded_rectangle([sb_x + 4, 110, sb_x + 20, 118], radius=3, fill=(130, 110, 75, 255), outline=sandbag_rim)
        
    # 5. Glowing neon signboard banner
    sign_box = [22, 36, 178, 54]
    draw.rectangle(sign_box, fill=(15, 20, 28, 255), outline=(16, 185, 129, 255), width=2)
    draw.text((28, 38), "24H • ПРОДУКТЫ • У МИХАЛЫЧА", fill=(52, 211, 153, 255))
    
    # Security searchlight spotlight on right corner
    draw.ellipse([168, 42, 178, 52], fill=(245, 240, 160, 255), outline=(50, 50, 50, 255))
    
    im.save('assets/sprites/buildings/mikhalyh_shop.png')
    print("Generated: assets/sprites/buildings/mikhalyh_shop.png")

if __name__ == "__main__":
    generate_asphalt()
    generate_ground_terrain()
    generate_sidewalk_tiles()
    generate_manhole()
    generate_puddle()
    generate_car_zhiguli()
    generate_car_uaz()
    generate_trash_dumpster()
    generate_military_crate()
    generate_mikhalyh_shop()
    print("ALL ENVIRONMENT TEXTURES AND SPRITES GENERATED SUCCESSFULLY!")
