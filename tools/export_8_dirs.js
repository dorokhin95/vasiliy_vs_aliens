const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;
  const url = 'http://localhost:8080/index.html';

  const tmpProfile = 'C:\\Users\\Павел\\AppData\\Local\\Temp\\chrome_test_profile_' + Date.now();
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpProfile}`,
    '--window-size=1280,720',
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
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  ws.onopen = async () => {
    await send('Runtime.enable');
    for (let i = 0; i < 30; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'window.threeEnemies && window.threeEnemies.isLoaded.grunt',
        returnByValue: true
      });
      if (chk.result && chk.result.value) break;
      await new Promise(r => setTimeout(r, 400));
    }

    const dirs = [
      { name: '0_RIGHT', deg: 0 },
      { name: '45_DOWN_RIGHT', deg: 45 },
      { name: '90_DOWN', deg: 90 },
      { name: '135_DOWN_LEFT', deg: 135 },
      { name: '180_LEFT', deg: 180 },
      { name: '225_UP_LEFT', deg: 225 },
      { name: '270_UP', deg: 270 },
      { name: '315_UP_RIGHT', deg: 315 }
    ];

    for (let d of dirs) {
      const angleRad = d.deg * Math.PI / 180;
      const res = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const mgr = window.threeEnemies;
            if (!mgr || !mgr.isLoaded['grunt']) return null;
            const dirIdx = Math.round((${angleRad} / (Math.PI * 2)) * mgr.numDirections) % mgr.numDirections;
            const canvas = mgr.getFrameCanvas('grunt', dirIdx, 0);
            return canvas ? canvas.toDataURL('image/png') : null;
          })()
        `,
        returnByValue: true
      });

      if (res.result && res.result.value) {
        const buf = Buffer.from(res.result.value.replace(/^data:image\/png;base64,/, ''), 'base64');
        const outPath = path.resolve(`assets/models/preview/dir_${d.name}.png`);
        fs.writeFileSync(outPath, buf);
        console.log(`Saved: ${outPath}`);
      }
    }

    ws.close();
    chrome.kill();
    console.log("All directions exported!");
    process.exit(0);
  };
}

run().catch(console.error);
