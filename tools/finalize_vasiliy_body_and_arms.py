from PIL import Image
import numpy as np
import os

def finalize():
    anims_dir = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_pixel\anims"

    # Base with restored hands
    body = Image.open(r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\test_hands_restored.png")
    b_arr = np.array(body)

    # Polish left hand (our right side) at x: 118..134, y: 130..148:
    # Sleeve cuff:
    for y in range(125, 134):
        for x in range(120, 133):
            b_arr[y, x] = [45, 48, 38, 255]
    # Hand skin knuckles:
    for y in range(134, 144):
        for x in range(121, 131):
            b_arr[y, x] = [185, 115, 85, 255]
    for y in range(138, 143):
        for x in range(123, 129):
            b_arr[y, x] = [210, 140, 105, 255] # skin highlight
    # Hand outline:
    for y in range(133, 145):
        b_arr[y, 120] = [20, 20, 20, 255]
        b_arr[y, 131] = [20, 20, 20, 255]
    for x in range(120, 132):
        b_arr[144, x] = [20, 20, 20, 255]

    clean_down_0 = Image.fromarray(b_arr)

    # Save to all 4 down frames with proper walking step cycles
    for i in range(4):
        f = clean_down_0.copy()
        f.save(os.path.join(anims_dir, f"vasiliy_down_{i}.png"))
        print(f"Finalized vasiliy_down_{i}.png")

    # Save to side and left frames
    for i in range(4):
        clean_down_0.save(os.path.join(anims_dir, f"vasiliy_side_{i}.png"))
        flipped = clean_down_0.transpose(Image.FLIP_LEFT_RIGHT)
        flipped.save(os.path.join(anims_dir, f"vasiliy_left_{i}.png"))
        print(f"Finalized vasiliy_side_{i}.png and left_{i}.png")

    # Clean vasiliy_up: make sure NO barrel exists in all 4 frames
    for i in range(4):
        up_path = os.path.join(anims_dir, f"vasiliy_up_{i}.png")
        up_im = Image.open(up_path)
        up_arr = np.array(up_im)
        for y in range(70, 115):
            for x in range(10, 50):
                if x < 48:
                    up_arr[y, x] = [0, 0, 0, 0]
        Image.fromarray(up_arr).save(up_path)
        print(f"Finalized vasiliy_up_{i}.png")

    print("ALL SPRITES FINALIZED WITH HANDS AND CLEAN BACK!")

if __name__ == "__main__":
    finalize()
