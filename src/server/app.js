const express = require('express');
const path = require('path');
const { setupRoutes } = require('./routes');
const { logInfo } = require('../utils/logger');

function startWebServer() {
  const app = express();
  const PORT = 25315;

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));
  
  setupRoutes(app);

  app.listen(PORT, () => {
    logInfo('SERVER', `Web server running at http://localhost:${PORT}`);
  });
}

module.exports = { startWebServer };