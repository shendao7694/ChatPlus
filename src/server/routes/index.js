const auth = require('./auth');
const config = require('./config');
const sessions = require('./sessions');
const send = require('./send');
const maps = require('./maps');
const events = require('./events');

function setupRoutes(app) {
  app.get('/auth/callback', auth.authCallback);

  app.get('/api/config', config.getConfig);
  app.put('/api/config', config.updateConfig);

  app.put('/api/session/order', sessions.reorderSessions);
  app.get('/api/sessions', sessions.listSessions);
  app.get('/api/session/:id', sessions.getSession);
  app.post('/api/session', sessions.createSession);
  app.put('/api/session/:id', sessions.updateSession);
  app.post('/api/session/switch/:id', sessions.switchSession);
  app.delete('/api/session/:id', sessions.deleteSession);

  app.post('/send', send.sendMessage);

  app.get('/api/maps', maps.getMaps);

  app.get('/events', events.eventsStream);
}

module.exports = { setupRoutes };