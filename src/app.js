const express = require('express');
const api = require('./routes/api');
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api', api);
app.use(express.static(require('node:path').join(__dirname, '..', 'public')));
app.use((err,_req,res,_next) => { const status=err.status || 500; res.status(status).json({error: status===500 ? 'Internal server error.' : err.message, ...(status!==500?{}:{detail:err.message})}); });
module.exports = app;
