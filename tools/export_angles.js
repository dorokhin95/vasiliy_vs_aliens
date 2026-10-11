const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;
  const url = 'http://localhost:8080/index.html';

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
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

  ws.onopen = async () => {
    await send('Runtime.enable');
    await new Promise(r => setTimeout(r, 2000));

    // Render each enemy type at 4 angles and export dataURL
    const angles = [
      { name: 'front', angle: Math.PI / 2 }, // facing down towards camera
      { name: 'right', angle: 0 },           // facing right
      { name: 'left',  angle: Math.PI },     // facing left
      { name: 'back',  angle: -Math.PI / 2 } // facing up away from camera
    ];

    for (const type of ['grunt', 'sniper', 'brute']) {
      for (const a of angles) {
        const res = await send('Runtime.evaluate', {
          expression: `
            (() => {
              const mgr = window.threeEnemies;
              if (!mgr || !mgr.isLoaded['${type}']) return null;
              
              // Angle
              const dirIdx = Math.round((${a.angle} / (Math.PI * 2)) * mgr.numDirections) % mgr.numDirections;
              const canvas = mgr.getFrameCanvas('${type}', dirIdx, 0);
              return canvas ? canvas.toDataURL('image/png') : null;
            })()
          `,
          returnByValue: true
        });

        if (res.result && res.result.value) {
          const dataUrl = res.result.value;
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
          const outPath = path.resolve(`assets/models/preview/angle_${type}_${a.name}.png`);
          fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
          console.log(`Saved: ${outPath}`);
        }
      }
    }

    ws.close();
    chrome.kill();
    process.exit(0);
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };
}

run().catch(console.error);
