const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;
  const url = 'http://localhost:8080/index.html';

  console.log('Launching Chrome headless with remote debugging...');
  const tmpProfile = 'C:\\Users\\Павел\\AppData\\Local\\Temp\\chrome_game_' + Date.now();
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpProfile}`,
    '--window-size=1280,720',
    url
  ]);

  // Wait for port to be ready
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

  if (!target || !target.webSocketDebuggerUrl) {
    console.error('Could not connect to Chrome CDP');
    chrome.kill();
    return;
  }

  console.log('Connected to Chrome page:', target.title);
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
    console.log('WebSocket CDP open!');
    await send('Runtime.enable');
    await send('Console.enable');
    await send('Page.enable');

    // Wait 2.5s for initial assets to load
    await new Promise(r => setTimeout(r, 2500));

    // Click "ВЫЙТИ В ГОРОД" button
    console.log('Clicking start game button...');
    await send('Runtime.evaluate', {
      expression: `
        const btn = document.getElementById('btn-start');
        if (btn) btn.click();
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      `
    });

    // Run into the city towards panel buildings and garages
    await send('Runtime.evaluate', {
      expression: `
        // Move towards bottom-right quadrant (x: 2300, y: 2200)
        player.x = 2250;
        player.y = 2200;
        camera.x = 2250 - canvas.width / 2;
        camera.y = 2200 - canvas.height / 2;
      `
    });
    await new Promise(r => setTimeout(r, 600));

    // Check status of ThreeEnemyManager and ThreeCharacterManager
    const statusRes = await send('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          vasiliyLoaded: window.threeCharacter ? window.threeCharacter.isLoaded : false,
          enemiesLoaded: window.threeEnemies ? window.threeEnemies.isLoaded : false,
          enemyCacheSize: window.threeEnemies ? window.threeEnemies.cache.size : 0,
          enemyCount: window.enemies ? window.enemies.length : 0
        })
      `,
      returnByValue: true
    });
    console.log('Engine Status:', statusRes.result.value);

    // Capture screenshot
    console.log('Capturing screenshot...');
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    const outPath = path.resolve('assets/models/preview/game_live_3d.png');
    fs.writeFileSync(outPath, buf);
    console.log('Saved screenshot to:', outPath);

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
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value || a.description).join(' ');
      console.log(`[Browser Console ${msg.params.type}]:`, args);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails;
      console.error('[Browser Exception]:', details.text, details.exception ? details.exception.description : '', details.url, 'line:', details.lineNumber);
    }
  };
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
