// server.js
// Run: npm init -y && npm install ws && node server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', socket => {
  console.log('Client connected');

  socket.on('message', msg => {
    const data = JSON.parse(msg);
    console.log('Received:', data);

    // Broadcast to all clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  socket.on('close', () => {
    console.log('Client disconnected');
  });
});

wss.on('connection', (ws) => {
  ws.role = 'unknown';

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === 'register' && msg.role) {
      ws.role = msg.role;
      clients[ws.role].add(ws);
      return;
    }

    // Passenger selects destination → forward to server and driver
    if (msg.type === 'destination_selected') {
      broadcastTo('server', msg);
      broadcastTo('driver', { type: 'dropoff_pin', destination: msg.destination, passengerId: msg.passengerId });
      return;
    }

    // Passenger GPS updates → forward to server (logic hub)
    if (msg.type === 'gps_update') {
      broadcastTo('server', msg);
      return;
    }

    // Server triggers driver alert
    if (msg.type === 'driver_alert') {
      broadcastTo('driver', msg);
      return;
    }

    // Server updates: arrival/completed → inform driver (remove pin or mark completed)
    if (msg.type === 'dropoff_completed') {
      broadcastTo('driver', msg);
      return;
    }
  });

  ws.on('close', () => {
    if (ws.role !== 'unknown') clients[ws.role].delete(ws);
  });
});

console.log('WebSocket relay running on ws://10.166.28.236:8080');
