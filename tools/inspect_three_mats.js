const { spawn } = require('child_process');

(async () => {
  const tmpProfile = 'C:\\Users\\Павел\\AppData\\Local\\Temp\\chrome_dbg_' + Date.now();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + tmpProfile,
    'http://localhost:8080/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
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

    const r = await send(`
      (() => {
        const mgr = window.threeEnemies;
        const model = mgr.models['grunt'];
        const list = [];
        model.traverse(c => {
          if (c.isMesh || c.isSkinnedMesh) {
            list.push({
              name: c.name,
              mat: c.material.name,
              transparent: c.material.transparent,
              opacity: c.material.opacity,
              depthWrite: c.material.depthWrite,
              side: c.material.side,
              renderOrder: c.renderOrder
            });
          }
        });
        return list;
      })()
    `);
    console.log('Material details:', JSON.stringify(r.result.result ? r.result.result.value : r.result.value, null, 2));
    chrome.kill();
    process.exit(0);
  };
})();
