const WebSocket = require('ws');
const crypto = require('crypto');
const axios = require('axios');
const { API_URL } = require('../constants');
const { broadcastToFrontend } = require('../utils/broadcast');
const { log, logInfo, logWarning, logError } = require('../utils/logger');

class ChatWSClient {
  constructor(token, mapId, mode, sessionId) {
    this.token = token;
    this.mapId = mapId;
    this.mode = mode || 'play';
    this.sessionId = sessionId || null;
    this.ws = null;
    this.connected = false;
    this.channel = this.getChannel();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
    this.isReconnecting = false;
    this.shouldReconnect = true;
    this.isManualClose = false;
    this.onlineInterval = null;
    this.messageHistory = [];
    this.MAX_HISTORY = 100;
    this.onlineUsers = [];
  }

  getChannel() {
    switch (this.mode) {
      case 'edit':
        return 'CHAT_MAP_EDIT';
      case 'world':
        return 'CHAT_WORLD';
      case 'play':
      default:
        return 'CHAT_MAP_PLAY';
    }
  }

  generateId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 21; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  addToHistory(msg) {
    this.messageHistory.push(msg);
    if (this.messageHistory.length > this.MAX_HISTORY) {
      this.messageHistory.shift();
    }
  }

  async getOnlineUsers() {
    try {
      const response = await axios.get(API_URL, {
        params: {
          limit: 500,
          mapId: this.mapId,
          targetId: this.mapId,
          mode: this.mode,
          wsChannel: this.channel
        }
      });
      
      if (response.data.code === 200) {
        this.onlineUsers = response.data.data.onlineUsers || [];
        broadcastToFrontend({
          type: 'online_users',
          sessionId: this.sessionId,
          data: response.data.data
        });
        return response.data.data;
      }
    } catch (error) {}
    return null;
  }

  connect() {
    const wsUrl = 'wss://743ec075.chat.box3.ink:50966/websocket';
    
    logInfo(`WS-${this.sessionId}`, `Connecting... Mode: ${this.mode}, Channel: ${this.channel}`);
    
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64')
      }
    });

    this.ws.on('open', () => {
      logInfo(`WS-${this.sessionId}`, 'Connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.shouldReconnect = true;
      this.isManualClose = false;
      
      this.send({
        opcode: 2,
        data: { token: this.token }
      });
      
      this.send({
        opcode: 4,
        channel: 'PLATFORM'
      });
      
      if (this.mode === 'world') {
        this.send({
          opcode: 4,
          channel: this.channel
        });
      } else {
        this.send({
          opcode: 4,
          channel: this.channel,
          data: { targetId: this.mapId }
        });
      }
      
      broadcastToFrontend({
        type: 'session_connected',
        sessionId: this.sessionId,
        data: { mode: this.mode, channel: this.channel }
      });
      
      if (this.onlineInterval) {
        clearInterval(this.onlineInterval);
      }
      this.onlineInterval = setInterval(() => {
        this.getOnlineUsers();
      }, 30000);
      
      this.getOnlineUsers();
    });

    this.ws.on('message', (data) => {
      try {
        const pkt = JSON.parse(data.toString());
        
        if (pkt.opcode === 0 && pkt.channel === this.channel) {
          const msg = pkt.data;
          if (msg?.user && msg?.content) {
            const messageData = {
              userId: msg.user.userId,
              nickname: msg.user.nickname,
              content: msg.content,
              timestamp: Date.now(),
              avatar: msg.user.avatar || ''
            };
            
            const exists = this.messageHistory.some(m => 
              m.content === messageData.content && 
              m.userId === messageData.userId && 
              Math.abs(m.timestamp - messageData.timestamp) < 1000
            );
            
            if (!exists) {
              this.addToHistory(messageData);
              broadcastToFrontend({
                type: 'message',
                sessionId: this.sessionId,
                data: messageData
              });
              log(`WS-${this.sessionId}`, `[${msg.user.nickname}]: ${msg.content}`);
            }
          }
        }
      } catch (e) {}
    });

    this.ws.on('error', (err) => {
      logError(`WS-${this.sessionId}`, `Error: ${err.message}`);
    });

    this.ws.on('close', () => {
      logInfo(`WS-${this.sessionId}`, 'Disconnected');
      this.connected = false;
      
      if (this.onlineInterval) {
        clearInterval(this.onlineInterval);
        this.onlineInterval = null;
      }
      
      broadcastToFrontend({
        type: 'session_disconnected',
        sessionId: this.sessionId,
        data: {}
      });
      
      if (this.shouldReconnect && !this.isManualClose) {
        this.attemptReconnect();
      }
    });
  }

  attemptReconnect() {
    if (this.isReconnecting) return;
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      logWarning(`WS-${this.sessionId}`, 'Max reconnection attempts reached');
      this.shouldReconnect = false;
      return;
    }
    
    this.isReconnecting = true;
    logWarning(`WS-${this.sessionId}`, `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.shouldReconnect && !this.connected) {
        this.isReconnecting = false;
        this.connect();
      } else {
        this.isReconnecting = false;
      }
    }, this.reconnectDelay);
  }

  send(packet) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    }
  }

  sendMessage(text) {
    if (!this.connected) {
      if (!this.isReconnecting && this.shouldReconnect) {
        this.attemptReconnect();
      }
      return;
    }
    
    const packet = {
      opcode: 0,
      channel: this.channel,
      event: 'CHAT_TXT',
      data: {
        messageId: this.generateId(),
        content: text
      }
    };

    if (this.mode !== 'world') {
      packet.data.targetId = this.mapId;
    }

    this.send(packet);
  }

  close() {
    this.shouldReconnect = false;
    this.isManualClose = true;
    this.isReconnecting = false;
    if (this.onlineInterval) {
      clearInterval(this.onlineInterval);
      this.onlineInterval = null;
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = ChatWSClient;