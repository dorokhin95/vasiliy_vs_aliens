with open(r'c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\src\game.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = [
    '  // Direction and aiming: follows mouse cursor (Twin-Stick / Top-Down Shooter)\n',
    '  const angleDeg = (player.angle * 180 / Math.PI + 360) % 360;\n',
    "  if (angleDeg > 230 && angleDeg < 310) {\n",
    "    player.moveDir = 'up';\n",
    "  } else if (angleDeg > 50 && angleDeg < 130) {\n",
    "    player.moveDir = 'down';\n",
    "  } else {\n",
    "    player.moveDir = 'side';\n",
    '  }\n',
    '  player.facingLeft = (angleDeg > 90 && angleDeg < 270);\n'
]

lines[1300:1323] = new_lines

with open(r'c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\src\game.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('SUCCESSFULLY UPDATED DIRECTION LOGIC!')
