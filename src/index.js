const readline = require('readline');
const ChatWSClient = require('./websocket/ChatWSClient');
const { loadConfig, saveConfig } = require('./config');
const { askHidden, askQuestion, askMode, printLine } = require('./utils/input');
const { broadcastToFrontend } = require('./utils/broadcast');
const { startWebServer } = require('./server/app');
const state = require('./server/handlers/state');
const { log, logInfo, logWarning, logError } = require('./utils/logger');

let isModifying = false;

async function main() {
  logInfo('MAIN', 'Box3 Chat ++ Starting...');
  
  const config = loadConfig();
  
  if (!state.globalToken) {
    state.globalToken = config.token || await askHidden('Token: ');
    config.token = state.globalToken;
    saveConfig(config);
    logInfo('MAIN', 'Token configured');
  } else {
    logInfo('MAIN', 'Token loaded from config');
  }
  
  const list = config.list || [];
  
  if (list.length === 0) {
    logInfo('MAIN', 'No sessions configured. Creating default session...');
    const mapId = await askQuestion('MapID: ');
    console.log('Available modes: play, edit, world');
    const mode = await askMode('Mode (default: play): ');
    const modeVal = mode.trim() || 'play';
    
    list.push({ mapId: mapId.trim(), mode: modeVal });
    config.list = list;
    saveConfig(config);
    
    state.sessionCounter = state.sessionCounter + 1;
    const sessionId = state.sessionCounter;
    const client = new ChatWSClient(state.globalToken, mapId.trim(), modeVal, sessionId);
    client.connect();
    state.sessions.set(sessionId, client);
    state.activeSessionId = sessionId;
    logInfo('MAIN', `Default session created: ${sessionId}`);
  } else {
    list.forEach((item, index) => {
      state.sessionCounter = state.sessionCounter + 1;
      const sessionId = state.sessionCounter;
      const client = new ChatWSClient(state.globalToken, item.mapId, item.mode || 'play', sessionId);
      client.connect();
      state.sessions.set(sessionId, client);
      if (index === 0) {
        state.activeSessionId = sessionId;
      }
    });
    logInfo('MAIN', `Loaded ${list.length} sessions`);
  }
  
  startWebServer();
  logInfo('MAIN', 'Type /help for available commands');
  
  const stdin = process.stdin;
  const stdout = process.stdout;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  
  let inputBuffer = '';
  
  stdin.on('data', (char) => {
    if (isModifying) return;
    
    char = char.toString();
    
    switch (char) {
      case '\r':
      case '\n':
        const text = inputBuffer.trim();
        inputBuffer = '';
        
        if (text === 'exit') {
          logInfo('MAIN', 'Exiting...');
          state.sessions.forEach((client) => client.close());
          process.exit(0);
          return;
        }
        
        if (text === '/help') {
          logInfo('MAIN', 'Available commands:');
          logInfo('MAIN', '  /sessions     - List all sessions');
          logInfo('MAIN', '  /active       - Show active session');
          logInfo('MAIN', '  /connect <id> - Switch to session');
          logInfo('MAIN', '  /create <mapId> <mode> - Create new session');
          logInfo('MAIN', '  /delete <id>  - Delete session');
          logInfo('MAIN', '  exit          - Exit program');
          break;
        }
        
        if (text === '/sessions') {
          logInfo('MAIN', '=== Sessions ===');
          if (state.sessions.size === 0) {
            logInfo('MAIN', '  No sessions');
          } else {
            state.sessions.forEach((client, id) => {
              const active = id === state.activeSessionId ? ' [ACTIVE]' : '';
              logInfo('MAIN', `  [${id}] ${client.mapId} (${client.mode}) - ${client.connected ? 'Online' : 'Offline'}${active} - ${client.messageHistory.length} messages`);
            });
          }
          break;
        }
        
        if (text === '/active') {
          if (state.activeSessionId && state.sessions.has(state.activeSessionId)) {
            const client = state.sessions.get(state.activeSessionId);
            logInfo('MAIN', `Active session: [${state.activeSessionId}] ${client.mapId} (${client.mode}) - ${client.connected ? 'Online' : 'Offline'}`);
          } else {
            logWarning('MAIN', 'No active session');
          }
          break;
        }
        
        if (text.startsWith('/connect ')) {
          const parts = text.split(' ');
          if (parts.length >= 2) {
            const sessionId = parseInt(parts[1]);
            if (state.sessions.has(sessionId)) {
              const oldActive = state.activeSessionId;
              state.activeSessionId = sessionId;
              const client = state.sessions.get(sessionId);
              logInfo('MAIN', `Switched to session ${sessionId} (${client.mapId})`);
              broadcastToFrontend({ type: 'session_switched', sessionId: sessionId });
              if (oldActive !== sessionId) {
                const newClient = new ChatWSClient(client.token, client.mapId, client.mode, sessionId);
                newClient.connect();
                state.sessions.set(sessionId, newClient);
                setTimeout(() => {
                  client.close();
                }, 500);
              }
            } else {
              logWarning('MAIN', `Session ${sessionId} not found`);
            }
          } else {
            logWarning('MAIN', 'Usage: connect <sessionId>');
          }
          break;
        }
        
        if (text.startsWith('/create ')) {
          const parts = text.split(' ');
          if (parts.length >= 2) {
            const mapId = parts[1];
            const mode = parts[2] || 'play';
            if (!state.globalToken) {
              logWarning('MAIN', 'Token not set. Please set token first.');
              break;
            }
            state.sessionCounter = state.sessionCounter + 1;
            const sessionId = state.sessionCounter;
            const client = new ChatWSClient(state.globalToken, mapId, mode, sessionId);
            client.connect();
            state.sessions.set(sessionId, client);
            const config = loadConfig();
            if (!config.list) config.list = [];
            config.list.push({ mapId: mapId, mode: mode });
            saveConfig(config);
            logInfo('MAIN', `Created session ${sessionId}: ${mapId} (${mode})`);
            broadcastToFrontend({ type: 'session_created', sessionId: sessionId });
          } else {
            logWarning('MAIN', 'Usage: create <mapId> <mode>');
          }
          break;
        }
        
        if (text.startsWith('/delete ')) {
          const parts = text.split(' ');
          if (parts.length >= 2) {
            const sessionId = parseInt(parts[1]);
            if (state.sessions.has(sessionId)) {
              const client = state.sessions.get(sessionId);
              client.close();
              state.sessions.delete(sessionId);
              const config = loadConfig();
              if (config.list) {
                config.list = config.list.filter((item, i) => i + 1 !== sessionId);
                saveConfig(config);
              }
              if (state.activeSessionId === sessionId) {
                state.activeSessionId = null;
                if (state.sessions.size > 0) {
                  const firstKey = state.sessions.keys().next().value;
                  state.activeSessionId = firstKey;
                }
              }
              logInfo('MAIN', `Deleted session ${sessionId}`);
              broadcastToFrontend({ type: 'session_deleted', sessionId: sessionId });
            } else {
              logWarning('MAIN', `Session ${sessionId} not found`);
            }
          } else {
            logWarning('MAIN', 'Usage: delete <sessionId>');
          }
          break;
        }
        
        if (text) {
          const targetClient = state.activeSessionId && state.sessions.has(state.activeSessionId) 
            ? state.sessions.get(state.activeSessionId) 
            : null;
          if (targetClient) {
            targetClient.sendMessage(text);
          } else {
            logWarning('MAIN', 'No active session');
          }
        }
        break;
        
      case '\u0003':
        logInfo('MAIN', 'Exiting...');
        state.sessions.forEach((client) => client.close());
        process.exit(0);
        break;
        
      case '\u007f':
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          readline.clearLine(stdout, 0);
          readline.cursorTo(stdout, 0);
          stdout.write('> ' + inputBuffer);
        }
        break;
        
      default:
        if (char.charCodeAt(0) >= 32) {
          inputBuffer += char;
          readline.clearLine(stdout, 0);
          readline.cursorTo(stdout, 0);
          stdout.write('> ' + inputBuffer);
        }
        break;
    }
  });
}

main().catch(console.error);