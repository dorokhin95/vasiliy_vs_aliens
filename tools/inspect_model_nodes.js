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
    // Wait until loaded
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 400));
      const chk = await new Promise(res2 => {
        const id = 100 + i;
        const handler = evt => {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            res2(msg.result.value);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression: 'window.threeEnemies && window.threeEnemies.isLoaded.grunt', returnByValue: true }
        }));
      });
      if (chk) break;
    }

    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const mgr = window.threeEnemies;
            const model = mgr.models['grunt'];
            const info = [];
            model.traverse(c => {
              info.push({
                name: c.name,
                type: c.type,
                rot: [c.rotation.x, c.rotation.y, c.rotation.z]
              });
            });
            return info;
          })()
        `,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id === 1) {
      console.log('Nodes in model:', JSON.stringify(msg.result.value, null, 2));
      chrome.kill();
      process.exit(0);
    }
  };
})();
