const axios = require('axios');

async function getMaps(req, res) {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 32;
    
    const response = await axios.get('https://dao3.fun/api/list-maps', {
      params: {
        offset: offset,
        limit: limit,
        tabKey1: 'mapPopular',
        lang: 'zh'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
}

module.exports = { getMaps };