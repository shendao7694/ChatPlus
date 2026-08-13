const sessionHandlers = require('../handlers/sessionHandlers');
const state = require('../handlers/state');

function reorderSessions(req, res) {
  const { order } = req.body;
  if (!order || !Array.isArray(order)) {
    return res.status(400).json({ error: 'Invalid order' });
  }
  
  try {
    sessionHandlers.reorderSessions(order);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function listSessions(req, res) {
  const sessionList = sessionHandlers.getSessionList();
  res.json({ sessions: sessionList, activeSession: state.activeSessionId });
}

function getSession(req, res) {
  const id = parseInt(req.params.id);
  const session = sessionHandlers.getSession(id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
}

function createSession(req, res) {
  const { mapId, mode } = req.body;
  
  if (!mapId) {
    return res.status(400).json({ error: 'MapId is required' });
  }
  
  try {
    const sessionId = sessionHandlers.createSession(mapId, mode);
    res.json({ success: true, sessionId: sessionId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function updateSession(req, res) {
  const id = parseInt(req.params.id);
  const { mapId, mode } = req.body;
  
  if (!mapId) {
    return res.status(400).json({ error: 'MapId is required' });
  }
  
  try {
    sessionHandlers.updateSession(id, mapId, mode);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

function switchSession(req, res) {
  const id = parseInt(req.params.id);
  try {
    sessionHandlers.switchSession(id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

function deleteSession(req, res) {
  const id = parseInt(req.params.id);
  try {
    sessionHandlers.deleteSession(id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

module.exports = {
  reorderSessions,
  listSessions,
  getSession,
  createSession,
  updateSession,
  switchSession,
  deleteSession
};