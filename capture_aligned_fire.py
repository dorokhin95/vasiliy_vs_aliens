import subprocess, os
from PIL import Image

for w in ['shotgun', 'plasma']:
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
          setTimeout(() => {{
            win.shootPlayerWeapon();
            console.log('Fired weapon {w}');
          }}, 500);
        }}, 1200);
      }}, 800);
    }};
  </script>
</body>
</html>"""
    
    html_file = f'test_fire_aligned_{w}.html'
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    out_png = os.path.abspath(f'verify_fire_aligned_{w}.png')
    cmd = [
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        '--headless=new',
        '--virtual-time-budget=7000',
        f'--screenshot={out_png}',
        f'http://localhost:8080/{html_file}'
    ]
    subprocess.run(cmd, check=True)
    im = Image.open(out_png)
    width, height = im.size
    crop = im.crop((width//2 - 100, height//2 - 100, width//2 + 160, height//2 + 100))
    crop.save(f'crop_fire_aligned_{w}.png')
    print(f'Captured crop_fire_aligned_{w}.png')
