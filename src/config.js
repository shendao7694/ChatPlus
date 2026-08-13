const fs = require('fs');
const { CONFIG_FILE } = require('./constants');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      return config;
    }
  } catch (e) {}
  return { token: '', list: [] };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {}
}

module.exports = { loadConfig, saveConfig };