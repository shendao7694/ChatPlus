const sessionHandlers = require('../handlers/sessionHandlers');

function sendMessage(req, res) {
  const { message } = req.body;
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    sessionHandlers.sendMessage(message);
    res.json({ success: true });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
}

module.exports = { sendMessage };