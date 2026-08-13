let sessions = new Map();
let activeSessionId = null;
let sessionCounter = 0;
let globalToken = '';

function getState() {
  return { sessions, activeSessionId, sessionCounter, globalToken };
}

function setState(newState) {
  sessions = newState.sessions || sessions;
  activeSessionId = newState.activeSessionId !== undefined ? newState.activeSessionId : activeSessionId;
  sessionCounter = newState.sessionCounter !== undefined ? newState.sessionCounter : sessionCounter;
  globalToken = newState.globalToken !== undefined ? newState.globalToken : globalToken;
}

function updateState(updates) {
  if (updates.sessions !== undefined) sessions = updates.sessions;
  if (updates.activeSessionId !== undefined) activeSessionId = updates.activeSessionId;
  if (updates.sessionCounter !== undefined) sessionCounter = updates.sessionCounter;
  if (updates.globalToken !== undefined) globalToken = updates.globalToken;
}

module.exports = {
  getState,
  setState,
  updateState,
  get sessions() { return sessions; },
  get activeSessionId() { return activeSessionId; },
  get sessionCounter() { return sessionCounter; },
  get globalToken() { return globalToken; },
  set sessions(val) { sessions = val; },
  set activeSessionId(val) { activeSessionId = val; },
  set sessionCounter(val) { sessionCounter = val; },
  set globalToken(val) { globalToken = val; }
};