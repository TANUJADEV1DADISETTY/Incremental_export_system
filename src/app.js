const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const app = express();

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  if (req.path !== '/health') {
    console.log(JSON.stringify({ 
      event: 'incoming-request', 
      method: req.method, 
      path: req.path, 
      consumerId: req.headers['x-consumer-id'] 
    }));
  }
  next();
});

app.use('/', routes);

module.exports = app;
