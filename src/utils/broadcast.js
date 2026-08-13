let frontendClients = new Set();
const messageCache = new Map();
const MAX_CACHE_SIZE = 100;

function broadcastToFrontend(data) {
  const message = JSON.stringify(data);
  
  let messageId = null;
  if (data.type === 'message' && data.data) {
    messageId = `${data.sessionId}-${data.data.timestamp}-${data.data.content}`;
    if (messageCache.has(messageId)) {
      return;
    }
    messageCache.set(messageId, Date.now());
    if (messageCache.size > MAX_CACHE_SIZE) {
      const oldestKey = messageCache.keys().next().value;
      messageCache.delete(oldestKey);
    }
  }
  
  frontendClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (e) {
      frontendClients.delete(client);
    }
  });
}

function getFrontendClients() {
  return frontendClients;
}

function clearMessageCache() {
  messageCache.clear();
}

module.exports = { 
  broadcastToFrontend, 
  getFrontendClients,
  clearMessageCache
};