const { spawn } = require('child_process');
const fs = require('fs');

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;
  const url = 'http://localhost:8080/index.html';
  const tmpProfile = 'C:\\Users\\Павел\\AppData\\Local\\Temp\\chrome_direct_' + Date.now();

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpProfile}`,
    url
  ]);

  let target = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      target = list.find(t => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let msgId = 1;

  function evalJs(expr) {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result ? msg.result.value : null);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    });
  }

  ws.onopen = async () => {
    // Wait until loaded
    for (let i = 0; i < 30; i++) {
      const loaded = await evalJs('window.threeEnemies && window.threeEnemies.isLoaded.grunt');
      if (loaded) break;
      await new Promise(r => setTimeout(r, 400));
    }

    const testAngles = [
      { name: 'rot_0', rotY: 0 },
      { name: 'rot_HALF_PI', rotY: Math.PI / 2 },
      { name: 'rot_PI', rotY: Math.PI },
      { name: 'rot_MINUS_HALF_PI', rotY: -Math.PI / 2 }
    ];

    for (let t of testAngles) {
      const b64 = await evalJs(`
        (() => {
          const mgr = window.threeEnemies;
          mgr.roots['grunt'].visible = true;
          mgr.roots['grunt'].rotation.y = ${t.rotY};
          mgr.renderer.render(mgr.scene, mgr.camera);
          return mgr.canvas.toDataURL('image/png');
        })()
      `);
      if (b64) {
        const buf = Buffer.from(b64.replace(/^data:image\/png;base64,/, ''), 'base64');
        fs.writeFileSync(`assets/models/preview/direct_${t.name}.png`, buf);
        console.log(`Saved: direct_${t.name}.png`);
      }
    }

    ws.close();
    chrome.kill();
    process.exit(0);
  };
}

run().catch(console.error);
