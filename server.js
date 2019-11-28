const express = require('express');
var app = express();
const cors = require('cors');
const compression = require('compression');
const http = require('http');

var requestor = require('./component/module_requestor');
var queries = require('./component/query_requestor');
const conn = require('./database/connection');

app.use(express.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.set('trust proxy', 1);

app.use(
  cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200
  })
);

app.use('/dev_req', requestor);
app.use('/query', queries);

app.get('*', (req, res) => {
  res.status(404).send('Fuck you! Nothing Here');
});

http.createServer(app).listen(process.env.PORT || 3200, () => {});
