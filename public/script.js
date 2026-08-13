const messageContainer = document.getElementById('messageContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const onlineList = document.getElementById('onlineList');
const onlineCount = document.getElementById('onlineCount');
const statusEl = document.getElementById('status');
const sessionTabsScroll = document.getElementById('sessionTabsScroll');
const mapList = document.getElementById('mapList');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOk = document.getElementById('confirmOk');
const confirmCancel = document.getElementById('confirmCancel');

let confirmCallback = null;
let sessions = [];
let activeSessionId = null;
let currentUserId = null;
let mapData = [];
let mapOffset = 0;
const MAP_LIMIT = 32;
let isLoadingMaps = false;
let hasMoreMaps = true;
let editingSessionId = null;
let isSwitching = false;
let sortableInstance = null;

const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');
const settingsCancel = document.getElementById('settingsCancel');
const settingsSave = document.getElementById('settingsSave');
const settingsToken = document.getElementById('settingsToken');
const currentToken = document.getElementById('currentToken');
const settingsMessage = document.getElementById('settingsMessage');
const toggleTokenBtn = document.getElementById('settingsToggleToken');

const sessionOverlay = document.getElementById('sessionOverlay');
const sessionClose = document.getElementById('sessionClose');
const sessionCancel = document.getElementById('sessionCancel');
const sessionSave = document.getElementById('sessionSave');
const sessionMapId = document.getElementById('sessionMapId');
const sessionMode = document.getElementById('sessionMode');
const sessionTitle = document.getElementById('sessionTitle');
const sessionMessage = document.getElementById('sessionMessage');

let settingsTokenVisible = false;

function getSavedOrder() {
  try {
    const saved = localStorage.getItem('sessionOrder');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveOrderToLocal(order) {
  try {
    localStorage.setItem('sessionOrder', JSON.stringify(order));
  } catch (e) {}
}

function saveSessionOrder(order) {
  saveOrderToLocal(order);
  fetch('/api/session/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: order })
  }).catch(err => console.error('Failed to save session order:', err));
}

function loadSessions() {
  fetch('/api/sessions')
    .then(res => res.json())
    .then(data => {
      const prevActive = activeSessionId;
      const serverSessions = data.sessions || [];
      
      if (sessions.length > 0 && serverSessions.length === sessions.length) {
        const sessionMap = {};
        serverSessions.forEach(s => {
          sessionMap[s.id] = s;
        });
        sessions.forEach(session => {
          const updated = sessionMap[session.id];
          if (updated) {
            session.connected = updated.connected;
            session.mapId = updated.mapId;
            session.mode = updated.mode;
            session.messageCount = updated.messageCount;
          }
        });
        const currentIds = sessions.map(s => s.id);
        const serverIds = serverSessions.map(s => s.id);
        serverIds.forEach(id => {
          if (!currentIds.includes(id)) {
            const newSession = serverSessions.find(s => s.id === id);
            sessions.push(newSession);
          }
        });
        for (let i = sessions.length - 1; i >= 0; i--) {
          if (!serverIds.includes(sessions[i].id)) {
            sessions.splice(i, 1);
          }
        }
        activeSessionId = data.activeSession;
      } else {
        const savedOrder = getSavedOrder();
        if (savedOrder && savedOrder.length > 0) {
          const orderedSessions = [];
          savedOrder.forEach(id => {
            const session = serverSessions.find(s => s.id === id);
            if (session) {
              orderedSessions.push(session);
            }
          });
          serverSessions.forEach(session => {
            if (!orderedSessions.some(s => s.id === session.id)) {
              orderedSessions.push(session);
            }
          });
          sessions = orderedSessions;
        } else {
          sessions = serverSessions;
        }
        activeSessionId = data.activeSession;
      }
      
      renderSessionTabs();
      
      if (sessions.length === 0) {
        messageContainer.innerHTML = '<div class="empty-state">请创建会话</div>';
        onlineList.innerHTML = '<div class="empty-state">暂无在线玩家</div>';
        onlineCount.textContent = '0';
        statusEl.textContent = '未连接';
        statusEl.className = 'status-disconnected';
        return;
      }
      
      if (activeSessionId && activeSessionId !== prevActive) {
        loadSessionData(activeSessionId);
      } else if (activeSessionId && !prevActive) {
        loadSessionData(activeSessionId);
      } else if (!activeSessionId && sessions.length > 0) {
        switchSession(sessions[0].id);
      }
    })
    .catch(err => console.error('Failed to load sessions:', err));
}

function renderSessionTabs() {
  sessionTabsScroll.innerHTML = '';
  
  sessions.forEach(session => {
    const tab = document.createElement('button');
    tab.className = 'session-tab' + (session.id === activeSessionId ? ' active' : '');
    tab.dataset.sessionId = session.id;
    
    const statusDot = document.createElement('span');
    statusDot.className = 'tab-status ' + (session.connected ? 'online' : 'offline');
    
    const name = document.createTextNode(session.mapId + ' [' + session.mode + ']');
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(session.id);
    });
    
    tab.appendChild(statusDot);
    tab.appendChild(name);
    tab.appendChild(closeBtn);
    
    tab.addEventListener('click', () => {
      if (session.id !== activeSessionId) {
        switchSession(session.id);
      }
    });
    
    tab.addEventListener('dblclick', () => {
      openSessionEditor(session.id);
    });
    
    sessionTabsScroll.appendChild(tab);
  });
  
  initSortable();
}

function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
  
  if (sessionTabsScroll.children.length === 0) return;
  
  sortableInstance = new Sortable(sessionTabsScroll, {
    animation: 200,
    easing: "cubic-bezier(1, 0, 0, 1)",
    handle: '.session-tab',
    direction: 'horizontal',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: function(evt) {
      const tabs = sessionTabsScroll.querySelectorAll('.session-tab');
      const newOrder = [];
      tabs.forEach(tab => {
        const sessionId = parseInt(tab.dataset.sessionId);
        if (sessionId) {
          newOrder.push(sessionId);
        }
      });
      
      const orderedSessions = [];
      newOrder.forEach(id => {
        const session = sessions.find(s => s.id === id);
        if (session) {
          orderedSessions.push(session);
        }
      });
      sessions.forEach(session => {
        if (!orderedSessions.some(s => s.id === session.id)) {
          orderedSessions.push(session);
        }
      });
      sessions = orderedSessions;
      saveSessionOrder(newOrder);
    }
  });
}

function switchSession(sessionId) {
  if (isSwitching) return;
  isSwitching = true;
  
  activeSessionId = sessionId;
  
  document.querySelectorAll('.session-tab').forEach(tab => {
    const id = parseInt(tab.dataset.sessionId);
    tab.classList.toggle('active', id === sessionId);
  });
  
  loadSessionData(sessionId);
  
  fetch('/api/session/switch/' + sessionId, { method: 'POST' })
    .then(() => {
      isSwitching = false;
    })
    .catch(() => {
      isSwitching = false;
    });
}

function loadSessionData(sessionId) {
  fetch('/api/session/' + sessionId)
    .then(res => res.json())
    .then(data => {
      if (sessionId !== activeSessionId) return;
      
      messageContainer.innerHTML = '';
      (data.messages || []).forEach(msg => addMessage(msg));
      
      if (data.onlineUsers && data.onlineUsers.length > 0) {
        updateOnlineList({ count: data.onlineUsers.length, onlineUsers: data.onlineUsers });
      } else {
        updateOnlineList({ count: 0, onlineUsers: [] });
      }
      
      if (data.connected) {
        statusEl.textContent = '已连接';
        statusEl.className = 'status-connected';
      } else {
        statusEl.textContent = '已断开';
        statusEl.className = 'status-disconnected';
      }
    })
    .catch(err => console.error('Failed to load session data:', err));
}

function deleteSession(sessionId) {
  showConfirm('确定要删除这个会话吗？', (confirmed) => {
    if (confirmed) {
      fetch('/api/session/' + sessionId, { method: 'DELETE' })
        .then(() => {
          loadSessions();
          if (sessions.length === 0) {
            messageContainer.innerHTML = '<div class="empty-state">请创建会话</div>';
            onlineList.innerHTML = '<div class="empty-state">暂无在线玩家</div>';
            onlineCount.textContent = '0';
            statusEl.textContent = '未连接';
            statusEl.className = 'status-disconnected';
          }
        });
    }
  });
}

function openSessionEditor(sessionId) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;
  
  editingSessionId = sessionId;
  sessionTitle.textContent = '编辑会话';
  sessionMapId.value = session.mapId;
  sessionMode.value = session.mode;
  sessionMessage.className = 'settings-message';
  sessionMessage.textContent = '';
  sessionOverlay.classList.add('active');
}

document.getElementById('addSessionBtn').addEventListener('click', () => {
  editingSessionId = null;
  sessionTitle.textContent = '新建会话';
  sessionMapId.value = '';
  sessionMode.value = 'play';
  sessionMessage.className = 'settings-message';
  sessionMessage.textContent = '';
  sessionOverlay.classList.add('active');
});

function loadSettings() {
  fetch('/api/config')
    .then(res => res.json())
    .then(data => {
      currentToken.textContent = maskToken(data.token);
      settingsToken.value = data.token || '';
    })
    .catch(err => console.error('Failed to load settings:', err));
}

function maskToken(token) {
  if (!token) return '未设置';
  if (token.length <= 10) return token;
  return token.substring(0, 6) + '...' + token.substring(token.length - 4);
}

settingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.add('active');
  loadSettings();
  settingsMessage.className = 'settings-message';
  settingsMessage.textContent = '';
});

function closeSettings() {
  settingsOverlay.classList.remove('active');
  settingsMessage.className = 'settings-message';
  settingsMessage.textContent = '';
}

settingsClose.addEventListener('click', closeSettings);
settingsCancel.addEventListener('click', closeSettings);

settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

function closeSessionEditor() {
  sessionOverlay.classList.remove('active');
  sessionMessage.className = 'settings-message';
  sessionMessage.textContent = '';
}

sessionClose.addEventListener('click', closeSessionEditor);
sessionCancel.addEventListener('click', closeSessionEditor);

sessionOverlay.addEventListener('click', (e) => {
  if (e.target === sessionOverlay) closeSessionEditor();
});

toggleTokenBtn.addEventListener('click', () => {
  settingsTokenVisible = !settingsTokenVisible;
  settingsToken.type = settingsTokenVisible ? 'text' : 'password';
  toggleTokenBtn.textContent = settingsTokenVisible ? '隐藏' : '显示';
});

settingsSave.addEventListener('click', () => {
  const token = settingsToken.value.trim();
  
  if (!token) {
    settingsMessage.className = 'settings-message error';
    settingsMessage.textContent = 'Token 不能为空';
    return;
  }
  
  settingsSave.disabled = true;
  settingsMessage.className = 'settings-message loading';
  settingsMessage.textContent = '保存中...';
  
  fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        settingsMessage.className = 'settings-message success';
        settingsMessage.textContent = 'Token 已更新';
        currentToken.textContent = maskToken(token);
        setTimeout(() => {
          closeSettings();
          settingsSave.disabled = false;
        }, 1000);
      } else {
        settingsMessage.className = 'settings-message error';
        settingsMessage.textContent = '' + (data.error || '保存失败');
        settingsSave.disabled = false;
      }
    })
    .catch(err => {
      settingsMessage.className = 'settings-message error';
      settingsMessage.textContent = '请求失败: ' + err.message;
      settingsSave.disabled = false;
    });
});

sessionSave.addEventListener('click', () => {
  const mapId = sessionMapId.value.trim();
  const mode = sessionMode.value;
  
  if (!mapId) {
    sessionMessage.className = 'settings-message error';
    sessionMessage.textContent = '地图 ID 不能为空';
    return;
  }
  
  sessionSave.disabled = true;
  sessionMessage.className = 'settings-message loading';
  sessionMessage.textContent = '保存中...';
  
  const url = editingSessionId ? '/api/session/' + editingSessionId : '/api/session';
  const method = editingSessionId ? 'PUT' : 'POST';
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapId, mode })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        sessionMessage.className = 'settings-message success';
        sessionMessage.textContent = editingSessionId ? '会话已更新' : '会话已创建';
        setTimeout(() => {
          closeSessionEditor();
          sessionSave.disabled = false;
          loadSessions();
        }, 1000);
      } else {
        sessionMessage.className = 'settings-message error';
        sessionMessage.textContent = (data.error || '保存失败');
        sessionSave.disabled = false;
      }
    })
    .catch(err => {
      sessionMessage.className = 'settings-message error';
      sessionMessage.textContent = '请求失败: ' + err.message;
      sessionSave.disabled = false;
    });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (settingsOverlay.classList.contains('active')) closeSettings();
    if (sessionOverlay.classList.contains('active')) closeSessionEditor();
  }
});

function connect() {
  const eventSource = new EventSource('/events');
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (e) {}
  };
  
  eventSource.onerror = () => {
    statusEl.textContent = '断开连接';
    statusEl.className = 'status-disconnected';
  };
}

function handleServerMessage(data) {
  switch (data.type) {
    case 'message':
      if (data.sessionId === activeSessionId) {
        addMessage(data.data);
      }
      break;
      
    case 'online_users':
      if (data.sessionId === activeSessionId) {
        updateOnlineList(data.data);
      }
      break;
      
    case 'session_connected':
    case 'session_disconnected':
    case 'session_created':
    case 'session_deleted':
    case 'session_switched':
    case 'session_updated':
      loadSessions();
      break;
      
    case 'connected':
      statusEl.textContent = '已连接';
      statusEl.className = 'status-connected';
      break;
      
    case 'disconnected':
      statusEl.textContent = '已断开';
      statusEl.className = 'status-disconnected';
      break;
  }
}

function addMessage(msg) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  
  const isSelf = msg.userId === currentUserId;
  if (isSelf) messageDiv.classList.add('self');
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  avatarDiv.style.cursor = 'pointer';
  avatarDiv.title = '点击查看资料';
  avatarDiv.addEventListener('click', () => {
    if (msg.userId) {
      openProfile(msg.userId);
    }
  });
  
  if (msg.avatar) {
    const img = document.createElement('img');
    img.src = msg.avatar;
    img.alt = msg.nickname;
    img.onerror = function() {
      this.style.display = 'none';
      avatarDiv.textContent = msg.nickname ? msg.nickname.charAt(0).toUpperCase() : '?';
    };
    avatarDiv.appendChild(img);
  } else {
    avatarDiv.textContent = msg.nickname ? msg.nickname.charAt(0).toUpperCase() : '?';
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';
  
  const headerDiv = document.createElement('div');
  headerDiv.className = 'msg-header';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'nickname';
  nameSpan.textContent = msg.nickname || 'Unknown';
  nameSpan.style.cursor = 'pointer';
  nameSpan.addEventListener('click', () => {
    if (msg.userId) {
      openProfile(msg.userId);
    }
  });
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'time';
  const date = new Date(msg.timestamp);
  timeSpan.textContent = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  
  headerDiv.appendChild(nameSpan);
  if (!isSelf) headerDiv.appendChild(timeSpan);
  
  const textDiv = document.createElement('div');
  textDiv.className = 'msg-text';
  textDiv.textContent = msg.content;
  
  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(textDiv);
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  if (isSelf) {
    const timeSpanSelf = document.createElement('span');
    timeSpanSelf.className = 'time';
    timeSpanSelf.textContent = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    headerDiv.appendChild(timeSpanSelf);
  }
  
  messageContainer.appendChild(messageDiv);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function updateOnlineList(data) {
  const { count, onlineUsers } = data;
  onlineCount.textContent = count || 0;
  
  onlineList.innerHTML = '';
  
  if (!onlineUsers || onlineUsers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '暂无在线玩家';
    onlineList.appendChild(empty);
    return;
  }
  
  onlineUsers.forEach(user => {
    const div = document.createElement('div');
    div.className = 'online-user';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    if (user.avatar) {
      const img = document.createElement('img');
      img.src = user.avatar;
      img.alt = user.nickname;
      avatarDiv.appendChild(img);
    } else {
      avatarDiv.textContent = user.nickname ? user.nickname.charAt(0).toUpperCase() : '?';
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'username';
    nameSpan.textContent = user.nickname || 'Unknown';
    
    const idSpan = document.createElement('span');
    idSpan.className = 'user-id';
    idSpan.textContent = user.userId;
    
    div.appendChild(avatarDiv);
    div.appendChild(nameSpan);
    div.appendChild(idSpan);
    
    div.addEventListener('click', () => {
      openProfile(user.userId);
    });
    
    onlineList.appendChild(div);
    
    if (user.userId && !currentUserId) {
      currentUserId = user.userId;
    }
  });
}

function openProfile(userId) {
  const overlay = document.createElement('div');
  overlay.className = 'profile-overlay';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'profile-close';
  closeBtn.textContent = '×';
  
  const iframe = document.createElement('iframe');
  iframe.className = 'profile-iframe';
  iframe.src = 'https://dao3.fun/profile/' + userId;
  iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
  iframe.allow = 'clipboard-read; clipboard-write';
  
  overlay.appendChild(closeBtn);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  
  closeBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handler);
    }
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  
  fetch('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  }).catch(console.error);
  
  messageInput.value = '';
}

function fetchMaps() {
  if (isLoadingMaps || !hasMoreMaps) return;
  
  isLoadingMaps = true;
  
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading-more';
  loadingEl.textContent = '加载中...';
  mapList.appendChild(loadingEl);
  
  fetch('/api/maps?offset=' + mapOffset + '&limit=' + MAP_LIMIT)
    .then(res => res.json())
    .then(data => {
      const loadingItem = mapList.querySelector('.loading-more');
      if (loadingItem) loadingItem.remove();
      
      if (data.rows && data.rows.length > 0) {
        mapData = mapData.concat(data.rows);
        renderMaps(data.rows);
        mapOffset += data.rows.length;
        hasMoreMaps = data.rows.length === MAP_LIMIT;
      } else {
        hasMoreMaps = false;
      }
      
      isLoadingMaps = false;
    })
    .catch(err => {
      console.error('Failed to fetch maps:', err);
      const loadingItem = mapList.querySelector('.loading-more');
      if (loadingItem) loadingItem.remove();
      isLoadingMaps = false;
    });
}

function renderMaps(maps) {
  maps.forEach(map => {
    const item = document.createElement('div');
    item.className = 'map-item';
    
    const preview = document.createElement('img');
    preview.className = 'map-preview';
    preview.src = map.preview || map.banner || '';
    preview.alt = map.name;
    preview.onerror = function() {
      this.style.display = 'none';
    };
    
    const info = document.createElement('div');
    info.className = 'map-info';
    
    const name = document.createElement('div');
    name.className = 'map-name';
    name.textContent = map.name;
    
    const stats = document.createElement('div');
    stats.className = 'map-stats';
    stats.innerHTML = `
      <span><i class="fas fa-user"></i> ${map.playCount || 0}</span>
      <span><i class="fas fa-heart" style="color:#e94560;"></i> ${map.likeCount || 0}</span>
      <span class="map-online"><i class="fas fa-circle" style="font-size:8px;color:#4ade80;"></i> ${map.onlineCount || 0}</span>
    `;
    
    const idSpan = document.createElement('span');
    idSpan.className = 'map-id';
    idSpan.textContent = map.contentId;
    
    info.appendChild(name);
    info.appendChild(stats);
    
    item.appendChild(preview);
    item.appendChild(info);
    item.appendChild(idSpan);
    
    item.addEventListener('click', () => {
      const mapId = String(map.contentId);
      navigator.clipboard.writeText(mapId).then(() => {
        const originalBorder = item.style.borderColor;
        item.style.borderColor = '#4ade80';
        const tip = document.createElement('div');
        tip.className = 'copy-tip';
        tip.textContent = '已复制: ' + mapId;
        tip.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a3a5a;color:#fff;padding:6px 14px;border-radius:6px;font-size:13px;z-index:999;animation:fadeInOut 1.5s ease;';
        document.body.appendChild(tip);
        setTimeout(() => {
          tip.remove();
        }, 1500);
        setTimeout(() => {
          item.style.borderColor = originalBorder;
        }, 1000);
      }).catch(() => {
        const mapId = String(map.contentId);
        const input = document.createElement('input');
        input.value = mapId;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        const tip = document.createElement('div');
        tip.className = 'copy-tip';
        tip.textContent = '已复制: ' + mapId;
        tip.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a3a5a;color:#fff;padding:6px 14px;border-radius:6px;font-size:13px;z-index:999;animation:fadeInOut 1.5s ease;';
        document.body.appendChild(tip);
        setTimeout(() => {
          tip.remove();
        }, 1500);
      });
    });
    
    mapList.appendChild(item);
  });
}

const mapListEl = document.getElementById('mapList');
mapListEl.addEventListener('scroll', function() {
  if (this.scrollTop + this.clientHeight >= this.scrollHeight - 20) {
    fetchMaps();
  }
});

const themeBtn = document.getElementById('themeBtn');
const themeIcon = themeBtn.querySelector('img');

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeIcon.src = theme === 'dark' ? 'picture/moon.png' : 'picture/sun.png';
  themeIcon.alt = theme === 'dark' ? '夜间模式' : '日间模式';
}

const savedTheme = localStorage.getItem('theme');
setTheme(savedTheme || 'dark');

themeBtn.addEventListener('click', () => {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

function showConfirm(message, callback) {
  confirmMessage.textContent = message;
  confirmOverlay.classList.add('active');
  confirmCallback = callback;
}

confirmOk.addEventListener('click', () => {
  confirmOverlay.classList.remove('active');
  if (confirmCallback) {
    confirmCallback(true);
    confirmCallback = null;
  }
});

confirmCancel.addEventListener('click', () => {
  confirmOverlay.classList.remove('active');
  if (confirmCallback) {
    confirmCallback(false);
    confirmCallback = null;
  }
});

confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.remove('active');
    if (confirmCallback) {
      confirmCallback(false);
      confirmCallback = null;
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && confirmOverlay.classList.contains('active')) {
    confirmOverlay.classList.remove('active');
    if (confirmCallback) {
      confirmCallback(false);
      confirmCallback = null;
    }
  }
});

document.getElementById('authVerifyBtn').addEventListener('click', function() {
  const token = settingsToken.value.trim();
  
  const clientId = 'arenapro';
  const scope = 'user:all';
  const state = '25315';
  const redirectUri = 'http://localhost:25315/auth/callback';
  
  let authUrl = 'https://dao3.fun/oauth2.0?';
  authUrl += 'response_type=code';
  authUrl += '&client_id=' + encodeURIComponent(clientId);
  authUrl += '&scope=' + encodeURIComponent(scope);
  authUrl += '&state=' + encodeURIComponent(state);
  authUrl += '&redirect_uri=' + encodeURIComponent(redirectUri);
  
  settingsMessage.className = 'settings-message loading';
  settingsMessage.textContent = '正在跳转到神岛验证页面...';
  
  setTimeout(() => {
    window.location.href = authUrl;
  }, 500);
});

sendButton.addEventListener('click', sendMessage);

connect();
loadSessions();
fetchMaps();