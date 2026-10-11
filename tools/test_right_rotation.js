const fs = require('fs');
const { spawn } = require('child_process');

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=9222', 'http://localhost:8080/index.html']);
  await new Promise(r => setTimeout(r, 2000));

  const res = await fetch('http://127.0.0.1:9222/json');
  const list = await res.json();
  const target = list.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.onopen = async () => {
    await new Promise(r => setTimeout(r, 2000));
    
    // Test angle = 0 (moving RIGHT) with targetRotation = angle - Math.PI / 2
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const mgr = window.threeEnemies;
            mgr.roots['grunt'].visible = true;
            // angle = 0 (RIGHT)
            const angle = 0;
            mgr.roots['grunt'].rotation.y = angle - Math.PI / 2;
            mgr.renderer.render(mgr.scene, mgr.camera);
            return mgr.canvas.toDataURL('image/png');
          })()
        `,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id === 1 && msg.result && msg.result.value) {
      const buf = Buffer.from(msg.result.value.replace(/^data:image\/png;base64,/, ''), 'base64');
      fs.writeFileSync('assets/models/preview/test_facing_right.png', buf);
      console.log('Saved test_facing_right.png');
      chrome.kill();
      process.exit(0);
    }
  };
})();
