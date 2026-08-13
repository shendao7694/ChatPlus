const ChatWSClient = require('../../websocket/ChatWSClient');
const { loadConfig, saveConfig } = require('../../config');
const { broadcastToFrontend } = require('../../utils/broadcast');
const state = require('./state');

function createSession(mapId, mode) {
  const token = state.globalToken;
  if (!token) {
    throw new Error('Token not set');
  }
  
  state.sessionCounter++;
  const sessionId = state.sessionCounter;
  const client = new ChatWSClient(token, mapId.trim(), mode || 'play', sessionId);
  client.connect();
  state.sessions.set(sessionId, client);
  
  if (!state.activeSessionId) {
    state.activeSessionId = sessionId;
  }
  
  const config = loadConfig();
  if (!config.list) config.list = [];
  config.list.push({ mapId: mapId.trim(), mode: mode || 'play' });
  saveConfig(config);
  
  broadcastToFrontend({ type: 'session_created', sessionId: sessionId });
  return sessionId;
}

function updateSession(id, mapId, mode) {
  const client = state.sessions.get(id);
  if (!client) {
    throw new Error('Session not found');
  }
  
  const oldClient = client;
  const newClient = new ChatWSClient(state.globalToken, mapId.trim(), mode || oldClient.mode, id);
  newClient.connect();
  state.sessions.set(id, newClient);
  
  setTimeout(() => {
    oldClient.close();
  }, 500);
  
  const config = loadConfig();
  if (config.list) {
    const index = config.list.findIndex((item, i) => i + 1 === id);
    if (index !== -1) {
      config.list[index] = { mapId: mapId.trim(), mode: mode || oldClient.mode };
      saveConfig(config);
    }
  }
  
  broadcastToFrontend({ type: 'session_updated', sessionId: id });
  return true;
}

function switchSession(id) {
  if (!state.sessions.has(id)) {
    throw new Error('Session not found');
  }
  state.activeSessionId = id;
  broadcastToFrontend({ type: 'session_switched', sessionId: id });
  return true;
}

function deleteSession(id) {
  const client = state.sessions.get(id);
  if (!client) {
    throw new Error('Session not found');
  }
  
  client.close();
  state.sessions.delete(id);
  
  const config = loadConfig();
  if (config.list) {
    config.list = config.list.filter((item, i) => i + 1 !== id);
    saveConfig(config);
  }
  
  if (state.activeSessionId === id) {
    state.activeSessionId = null;
    if (state.sessions.size > 0) {
      const firstKey = state.sessions.keys().next().value;
      state.activeSessionId = firstKey;
    }
  }
  
  broadcastToFrontend({ type: 'session_deleted', sessionId: id });
  return true;
}

function reorderSessions(order) {
  const config = loadConfig();
  if (!config.list) {
    throw new Error('No sessions configured');
  }
  
  const newList = [];
  order.forEach(id => {
    const index = id - 1;
    if (config.list[index]) {
      newList.push(config.list[index]);
    }
  });
  config.list = newList;
  saveConfig(config);
  return true;
}

function getSessionList() {
  const sessionList = [];
  state.sessions.forEach((client, id) => {
    sessionList.push({
      id: id,
      mapId: client.mapId,
      mode: client.mode,
      connected: client.connected,
      active: id === state.activeSessionId,
      messageCount: client.messageHistory.length
    });
  });
  return sessionList;
}

function getSession(id) {
  const client = state.sessions.get(id);
  if (!client) {
    return null;
  }
  return {
    id: id,
    mapId: client.mapId,
    mode: client.mode,
    connected: client.connected,
    messages: client.messageHistory,
    onlineUsers: client.onlineUsers
  };
}

function getActiveSession() {
  if (state.activeSessionId && state.sessions.has(state.activeSessionId)) {
    return state.sessions.get(state.activeSessionId);
  }
  return null;
}

function sendMessage(message) {
  const targetClient = getActiveSession();
  if (!targetClient || !targetClient.connected) {
    throw new Error('Not connected');
  }
  targetClient.sendMessage(message.trim());
  return true;
}

module.exports = {
  createSession,
  updateSession,
  switchSession,
  deleteSession,
  reorderSessions,
  getSessionList,
  getSession,
  getActiveSession,
  sendMessage
};