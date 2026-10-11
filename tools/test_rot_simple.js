const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
  const tmpProfile = 'C:\\Users\\Павел\\AppData\\Local\\Temp\\chrome_side_' + Date.now();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + tmpProfile,
    'http://localhost:8080/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1500));
  const res = await fetch('http://127.0.0.1:9222/json');
  const list = await res.json();
  const target = list.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.onopen = async () => {
    let msgId = 1;
    function send(expr) {
      return new Promise(res2 => {
        const id = msgId++;
        const h = evt => {
          const m = JSON.parse(evt.data);
          if (m.id === id) { ws.removeEventListener('message', h); res2(m); }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      });
    }

    for (let i = 0; i < 30; i++) {
      const chk = await send('window.threeEnemies && window.threeEnemies.isLoaded.grunt');
      if (chk.result && (chk.result.value || (chk.result.result && chk.result.result.value))) break;
      await new Promise(r => setTimeout(r, 400));
    }

    // Apply depthWrite fix
    await send(`
      (() => {
        const mgr = window.threeEnemies;
        const model = mgr.models['grunt'];
        model.traverse(c => {
          if (c.isMesh || c.isSkinnedMesh) {
            c.material.depthWrite = true;
            c.material.alphaTest = 0.4;
            c.material.transparent = false;
            c.material.needsUpdate = true;
          }
        });
      })()
    `);

    const testAngles = [
      { name: 'rot_PLUS_HALF_PI', rotY: Math.PI / 2 },
      { name: 'rot_MINUS_HALF_PI', rotY: -Math.PI / 2 }
    ];

    for (let t of testAngles) {
      const r = await send(`
        (() => {
          const mgr = window.threeEnemies;
          mgr.roots['grunt'].visible = true;
          mgr.roots['grunt'].rotation.y = ${t.rotY};
          mgr.renderer.render(mgr.scene, mgr.camera);
          return mgr.canvas.toDataURL('image/png');
        })()
      `);
      const val = (r.result && r.result.result && r.result.result.value) || (r.result && r.result.value);
      if (val) {
        const buf = Buffer.from(val.replace(/^data:image\/png;base64,/, ''), 'base64');
        fs.writeFileSync('assets/models/preview/direct_' + t.name + '.png', buf);
        console.log('Saved direct_' + t.name + '.png');
      }
    }

    ws.close();
    chrome.kill();
    process.exit(0);
  };
})();
