import cv2
import numpy as np
from PIL import Image, ImageDraw
import os
import random

os.makedirs('assets/sprites/buildings', exist_ok=True)

def generate_panel_building(w, h, filename, seed=42):
    """
    Renders a 2.5D Soviet Panel Building (Хрущёвка/Брежневка).
    Includes:
    - Flat gravel/tar roof with parapet border
    - Elevator housing, ventilation ducts, TV antennas
    - Facade with concrete panels, tar joints, balconies
    - High-detail windows with realistic warm/cool/dark states
    - Ambient ground drop shadow
    """
    pad_shadow = 24
    img_w = w + pad_shadow * 2
    img_h = h + pad_shadow * 2
    
    im = Image.new('RGBA', (img_w, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    np.random.seed(seed)
    random.seed(seed)
    
    # 1. Ambient Occlusion Drop Shadow (south and east)
    draw.rectangle([pad_shadow - 6, pad_shadow + 8, pad_shadow + w + 16, pad_shadow + h + 16], fill=(0, 0, 0, 140))
    
    # In 2.5D:
    # Top portion is the ROOF (depth perspective)
    # Bottom portion is the SOUTH FACADE
    facade_h = min(68, int(h * 0.40))
    roof_h = h - facade_h
    
    bx = pad_shadow
    by = pad_shadow
    
    # 2. SOUTH FACADE (Concrete panels with tar joints)
    facade_y = by + roof_h
    draw.rectangle([bx, facade_y, bx + w, facade_y + facade_h], fill=(52, 60, 72, 255), outline=(26, 32, 40, 255), width=2)
    
    # Concrete panels texture & seams
    panel_step_x = 44
    for px in range(bx, bx + w, panel_step_x):
        draw.line([(px, facade_y), (px, facade_y + facade_h)], fill=(28, 34, 42, 255), width=2) # Tar joint
        # Vertical water/dirt streaks
        if random.random() > 0.5:
            draw.line([(px + 2, facade_y), (px + 2, facade_y + random.randint(15, facade_h))], fill=(22, 26, 32, 180), width=1)
            
    # Windows & Balconies on facade
    win_w, win_h = 16, 20
    for px in range(bx + 14, bx + w - 18, panel_step_x):
        # Window or Balcony
        is_balcony = (px // panel_step_x) % 3 == 0 and facade_h > 45
        if is_balcony:
            # Balcony enclosure (corrugated siding)
            balc_col = random.choice([(65, 80, 95, 255), (75, 85, 70, 255), (85, 75, 65, 255)])
            draw.rectangle([px - 2, facade_y + 12, px + 22, facade_y + facade_h - 4], fill=balc_col, outline=(30, 36, 44, 255))
            # Glass top
            draw.rectangle([px, facade_y + 14, px + 20, facade_y + 26], fill=(35, 55, 70, 220), outline=(25, 35, 45, 255))
        else:
            # Window frame (white/grey plastic or brown weathered wood)
            frame_col = random.choice([(140, 145, 150, 255), (95, 70, 48, 255)])
            draw.rectangle([px, facade_y + 8, px + win_w, facade_y + 8 + win_h], fill=frame_col, outline=(25, 30, 36, 255), width=1)
            
            # Window glass state
            win_state = random.choices(['warm', 'cool', 'dark', 'boarded'], weights=[0.35, 0.20, 0.40, 0.05])[0]
            if win_state == 'warm':
                # Cozy amber/yellow room light
                draw.rectangle([px + 2, facade_y + 10, px + win_w - 2, facade_y + 6 + win_h], fill=(235, 195, 75, 255))
                # Curtains
                draw.rectangle([px + 2, facade_y + 10, px + 5, facade_y + 6 + win_h], fill=(180, 70, 60, 255))
            elif win_state == 'cool':
                # CRT Television cyan glow
                draw.rectangle([px + 2, facade_y + 10, px + win_w - 2, facade_y + 6 + win_h], fill=(95, 185, 235, 255))
            elif win_state == 'dark':
                # Empty / unlit dark glass
                draw.rectangle([px + 2, facade_y + 10, px + win_w - 2, facade_y + 6 + win_h], fill=(22, 28, 36, 255))
            else:
                # Boarded up with wooden planks
                draw.rectangle([px + 2, facade_y + 10, px + win_w - 2, facade_y + 6 + win_h], fill=(85, 65, 42, 255))
                draw.line([(px + 2, facade_y + 14), (px + win_w - 2, facade_y + 14)], fill=(45, 35, 22, 255), width=1)
                
            # Window cross frame mullions
            draw.line([(px + win_w // 2, facade_y + 10), (px + win_w // 2, facade_y + 6 + win_h)], fill=(40, 45, 52, 255), width=1)

    # 3. ROOF SURFACE (Dark bituminous felt / gravel рубероид)
    draw.rectangle([bx, by, bx + w, by + roof_h], fill=(32, 38, 48, 255), outline=(18, 22, 28, 255), width=2)
    
    # Roof seams (rolls of tar paper)
    for ry in range(by + 16, by + roof_h - 10, 20):
        draw.line([(bx + 4, ry), (bx + w - 4, ry)], fill=(24, 28, 35, 255), width=2)
        
    # Roof Parapet (concrete rim border around roof edge)
    parapet_col = (68, 76, 88, 255)
    draw.rectangle([bx, by, bx + w, by + 6], fill=parapet_col) # North edge
    draw.rectangle([bx, by, bx + 6, by + roof_h], fill=parapet_col) # West edge
    draw.rectangle([bx + w - 6, by, bx + w, by + roof_h], fill=parapet_col) # East edge
    draw.rectangle([bx, by + roof_h - 5, bx + w, by + roof_h], fill=(42, 48, 56, 255)) # South ledge
    
    # Roof structures: Elevator engine room, ventilation shafts, TV antennas
    # Elevator / staircase roof cabin
    cab_w = min(54, w // 4)
    cab_h = min(36, roof_h // 3)
    cab_x = bx + w // 2 - cab_w // 2
    cab_y = by + roof_h // 2 - cab_h // 2
    draw.rectangle([cab_x, cab_y, cab_x + cab_w, cab_y + cab_h], fill=(58, 66, 78, 255), outline=(22, 26, 32, 255), width=2)
    # Cabin door
    draw.rectangle([cab_x + 8, cab_y + cab_h - 14, cab_x + 20, cab_y + cab_h], fill=(35, 38, 44, 255))
    
    # Ventilation duct boxes (Жестяные короба вытяжки)
    for vx, vy in [(bx + 24, by + 18), (bx + w - 42, by + 22), (bx + 35, by + roof_h - 26)]:
        if vx + 16 < bx + w and vy + 14 < by + roof_h:
            draw.rectangle([vx, vy, vx + 16, vy + 14], fill=(75, 82, 92, 255), outline=(32, 36, 42, 255), width=1)
            draw.rectangle([vx + 2, vy + 2, vx + 14, vy + 6], fill=(26, 30, 36, 255)) # Dark vent grille
            
    # Television antennas (Советские Т-образные и паутинные антенны)
    for ax, ay in [(bx + 18, by + 12), (bx + w - 24, by + roof_h - 16)]:
        draw.line([(ax, ay), (ax, ay - 14)], fill=(160, 165, 175, 255), width=2)
        draw.line([(ax - 8, ay - 14), (ax + 8, ay - 14)], fill=(160, 165, 175, 255), width=2)
        draw.line([(ax - 5, ay - 9), (ax + 5, ay - 9)], fill=(140, 145, 155, 255), width=1)
        
    im.save(filename)
    print(f"Generated: {filename} ({img_w}x{img_h})")

def generate_garage_block(w, h, filename):
    """
    Renders a Soviet Brick Garage Co-op (Гаражи).
    Includes weathered brick masonry, corrugated iron roof, swing gates with padlocks.
    """
    pad_shadow = 16
    img_w = w + pad_shadow * 2
    img_h = h + pad_shadow * 2
    
    im = Image.new('RGBA', (img_w, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    # Shadow
    draw.rectangle([pad_shadow - 4, pad_shadow + 6, pad_shadow + w + 10, pad_shadow + h + 10], fill=(0, 0, 0, 135))
    
    bx = pad_shadow
    by = pad_shadow
    
    facade_h = 36
    roof_h = h - facade_h
    
    # Roof (Corrugated slate / metal with rust)
    draw.rectangle([bx, by, bx + w, by + roof_h], fill=(48, 54, 58, 255), outline=(22, 25, 28, 255), width=2)
    for rx in range(bx + 4, bx + w - 4, 6):
        draw.line([(rx, by), (rx, by + roof_h)], fill=(62, 70, 76, 255), width=1)
        # Occasional rust streak
        if rx % 18 == 0:
            draw.line([(rx, by + 8), (rx, by + roof_h - 4)], fill=(95, 52, 28, 220), width=2)
            
    # Front Brick Facade with 3 Garage Doors
    draw.rectangle([bx, by + roof_h, bx + w, by + h], fill=(95, 48, 36, 255), outline=(32, 24, 20, 255), width=2)
    
    # 3 Individual Garage Boxes
    door_w = (w - 16) // 3
    door_colors = [
        (42, 65, 48, 255), # Faded green
        (85, 45, 32, 255), # Red lead primer
        (45, 58, 75, 255)  # Faded blue
    ]
    
    for i in range(3):
        dx = bx + 4 + i * (door_w + 4)
        dy = by + roof_h + 4
        dh = facade_h - 6
        d_col = door_colors[i]
        
        # Concrete door frame
        draw.rectangle([dx, dy, dx + door_w, dy + dh], fill=(70, 75, 82, 255), outline=(35, 38, 42, 255))
        # Metal swing gates
        draw.rectangle([dx + 2, dy + 2, dx + door_w - 2, dy + dh], fill=d_col, outline=(22, 25, 28, 255))
        # Center split seam
        mid_x = dx + door_w // 2
        draw.line([(mid_x, dy + 2), (mid_x, dy + dh)], fill=(20, 22, 26, 255), width=2)
        # Hinges
        draw.rectangle([dx + 2, dy + 5, dx + 5, dy + 8], fill=(120, 125, 130, 255))
        draw.rectangle([dx + 2, dy + dh - 8, dx + 5, dy + dh - 5], fill=(120, 125, 130, 255))
        draw.rectangle([dx + door_w - 5, dy + 5, dx + door_w - 2, dy + 8], fill=(120, 125, 130, 255))
        draw.rectangle([dx + door_w - 5, dy + dh - 8, dx + door_w - 2, dy + dh - 5], fill=(120, 125, 130, 255))
        # Padlock
        draw.ellipse([mid_x - 3, dy + dh // 2 - 2, mid_x + 3, dy + dh // 2 + 4], fill=(160, 130, 40, 255))
        
    im.save(filename)
    print(f"Generated: {filename} ({img_w}x{img_h})")

if __name__ == "__main__":
    generate_panel_building(320, 160, 'assets/sprites/buildings/building_panel_320x160.png', seed=42)
    generate_panel_building(220, 260, 'assets/sprites/buildings/building_panel_220x260.png', seed=137)
    generate_garage_block(140, 100, 'assets/sprites/buildings/garage_block_140x100.png')
    print("ALL 2.5D BUILDING SPRITES GENERATED!")
