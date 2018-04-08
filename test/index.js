const http = require('http');
const express = require('express');
const app = express();

app.use('/dist', express.static('../dist'));
app.get('/', (req, res, next) => {
  res.sendFile('index.html', {root: __dirname});
});
http.createServer(app).listen(80);
console.log('Test server running..');
