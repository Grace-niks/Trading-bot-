
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

let botState = global.botState;

app.get('/status', (req, res) => {
  res.json(botState);
});

module.exports = app;
