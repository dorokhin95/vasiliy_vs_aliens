import subprocess
import os
import time
from PIL import Image

out_png = os.path.abspath('gameplay_verify.png')
cmd = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--virtual-time-budget=3000',
    f'--screenshot={out_png}',
    'http://localhost:8080/index.html'
]
subprocess.run(cmd, check=True)
if os.path.exists(out_png):
    im = Image.open(out_png)
    print('Captured gameplay_verify.png:', im.size)
