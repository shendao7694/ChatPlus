const { getFrontendClients } = require('../../utils/broadcast');
const state = require('../handlers/state');

function eventsStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const frontendClients = getFrontendClients();
  if (!frontendClients) {
    console.error('frontendClients is undefined');
    return res.status(500).end();
  }
  
  frontendClients.add(res);

  const sessions = state.sessions;
  const activeSessionId = state.activeSessionId;
  
  sessions.forEach((client, id) => {
    if (client.connected) {
      res.write(`data: ${JSON.stringify({ type: 'session_connected', sessionId: id })}\n\n`);
    }
    if (client.onlineUsers && client.onlineUsers.length > 0) {
      res.write(`data: ${JSON.stringify({ 
        type: 'online_users', 
        sessionId: id, 
        data: { 
          count: client.onlineUsers.length, 
          onlineUsers: client.onlineUsers 
        } 
      })}\n\n`);
    }
  });
  
  if (activeSessionId) {
    res.write(`data: ${JSON.stringify({ type: 'session_switched', sessionId: activeSessionId })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'ready' })}\n\n`);

  req.on('close', () => {
    frontendClients.delete(res);
    res.end();
  });
}

module.exports = { eventsStream };