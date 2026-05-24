const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

const rooms = {};

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const room = url.searchParams.get('room') || 'default';
  const userId = url.searchParams.get('user') || 'anon';

  if (!rooms[room]) rooms[room] = {};
  rooms[room][userId] = ws;

  // Пересылаем сигналы всем в комнате
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.to) {
      const target = rooms[room][msg.to];
      if (target && target.readyState === 1) {
        target.send(JSON.stringify({ from: userId, ...msg }));
      }
    } else {
      // Broadcast
      Object.entries(rooms[room]).forEach(([id, client]) => {
        if (id !== userId && client.readyState === 1) {
          client.send(JSON.stringify({ from: userId, ...msg }));
        }
      });
    }
  });

  ws.on('close', () => {
    if (rooms[room][userId]) {
      delete rooms[room][userId];
      if (Object.keys(rooms[room]).length === 0) delete rooms[room];
    }
  });

  ws.send(JSON.stringify({ type: 'welcome', userId }));
});

console.log('Signal server running');
