import subprocess, os
from PIL import Image

for w in ['shotgun', 'drill', 'plasma']:
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; background:#0b0d10; overflow:hidden;">
  <iframe id="gf" src="index.html" style="width:100vw; height:100vh; border:none;"></iframe>
  <script>
    const iframe = document.getElementById('gf');
    iframe.onload = () => {{
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      setTimeout(() => {{
        doc.getElementById('btn-start').click();
        setTimeout(() => {{
          win.switchWeapon('{w}');
          const cx = win.innerWidth / 2;
          const cy = win.innerHeight / 2;
          win.dispatchEvent(new MouseEvent('mousemove', {{ clientX: cx + 300, clientY: cy }}));
        }}, 800);
      }}, 500);
    }};
  </script>
</body>
</html>"""
    
    html_path = f'test_switch_{w}.html'
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    out_png = os.path.abspath(f'verify_{w}_switch.png')
    cmd = [
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        '--headless=new',
        '--virtual-time-budget=6000',
        f'--screenshot={out_png}',
        f'http://localhost:8080/{html_path}'
    ]
    subprocess.run(cmd, check=True)
    im = Image.open(out_png)
    width, height = im.size
    crop = im.crop((width//2 - 100, height//2 - 100, width//2 + 160, height//2 + 100))
    crop.save(f'crop_verify_{w}_switch.png')
    print(f'Rendered and verified {w}')
