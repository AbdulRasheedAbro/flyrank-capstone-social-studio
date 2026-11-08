require('dotenv').config();
const { startScheduler } = require('./services/scheduler');
console.log('Social Media Studio scheduler worker started.');
startScheduler();
