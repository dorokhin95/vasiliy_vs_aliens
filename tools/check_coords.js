(async () => {
  const { spawn } = require('child_process');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=9222', 'http://localhost:8080/index.html']);
  await new Promise(r => setTimeout(r, 2000));

  const res = await fetch('http://127.0.0.1:9222/json');
  const list = await res.json();
  const target = list.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.onopen = async () => {
    await new Promise(r => setTimeout(r, 2000));
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const mgr = window.threeEnemies;
            const model = mgr.models['grunt'];
            let meshes = [];
            model.traverse(c => { if (c.isMesh || c.isSkinnedMesh) meshes.push(c); });
            const mesh = meshes[0];
            const pos = mesh.geometry.attributes.position;
            return {
              name: mesh.name,
              v0_front: [pos.getX(0), pos.getY(0), pos.getZ(0)],
              v1_back: [pos.getX(1), pos.getY(1), pos.getZ(1)]
            };
          })()
        `,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id === 1) {
      console.log('Result:', msg.result.value);
      chrome.kill();
      process.exit(0);
    }
  };
})();
