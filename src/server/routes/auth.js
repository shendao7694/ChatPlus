const { NodeRSA } = require('node-rsa');
const { RSA_PUBLIC_KEY } = require('../../constants');
const { loadConfig, saveConfig } = require('../../config');
const { printLine } = require('../../utils/input');
const ChatWSClient = require('../../websocket/ChatWSClient');
const state = require('../handlers/state');
const { createSession } = require('../handlers/sessionHandlers');

function authCallback(req, res) {
  const { access_token, state: queryState } = req.query;
  
  if (!access_token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>登录失败</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1a1a2e;color:#eee;margin:0;">
          <div style="text-align:center;">
            <h1 style="color:#f87171;">登录失败</h1>
            <p>未获取到 access_token</p>
            <a href="/" style="color:#e94560;text-decoration:underline;">返回</a>
          </div>
        </body>
      </html>
    `);
  }
  
  try {
    const rsa = new NodeRSA(RSA_PUBLIC_KEY);
    const decrypted = rsa.decrypt(access_token, 'utf8');
    const decryptedData = JSON.parse(decrypted);
    
    const token = decryptedData.token;
    
    if (!token) {
      throw new Error('No token in decrypted data');
    }
    
    const config = loadConfig();
    config.token = token;
    state.globalToken = token;
    saveConfig(config);
    
    // 重新连接所有会话
    const sessions = state.sessions;
    sessions.forEach((client, id) => {
      const newClient = new ChatWSClient(state.globalToken, client.mapId, client.mode, id);
      newClient.connect();
      sessions.set(id, newClient);
      setTimeout(() => {
        client.close();
      }, 500);
    });
    
    printLine('Token updated via OAuth callback');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>登录成功</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1a1a2e;color:#eee;margin:0;">
          <div style="text-align:center;">
            <h1 style="color:#4ade80;">登录成功</h1>
            <p>Token 已更新，请返回主页面</p>
            <a href="/" style="color:#e94560;text-decoration:underline;">返回</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    printLine(`OAuth error: ${error.message}`);
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>登录失败</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1a1a2e;color:#eee;margin:0;">
          <div style="text-align:center;">
            <h1 style="color:#f87171;">登录失败</h1>
            <p>${error.message}</p>
            <a href="/" style="color:#e94560;text-decoration:underline;">返回</a>
          </div>
        </body>
      </html>
    `);
  }
}

module.exports = { authCallback };