const { loadConfig, saveConfig } = require('../../config');
const state = require('../handlers/state');

function getConfig(req, res) {
  const config = loadConfig();
  res.json({ token: config.token || '' });
}

function updateConfig(req, res) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  const config = loadConfig();
  config.token = token.trim();
  state.globalToken = token.trim();
  saveConfig(config);
  res.json({ success: true });
}

module.exports = { getConfig, updateConfig };