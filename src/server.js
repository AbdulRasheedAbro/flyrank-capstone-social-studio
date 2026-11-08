require('dotenv').config();
const app = require('./app');
const { startScheduler } = require('./services/scheduler');
const port = Number(process.env.PORT || 3000);
app.listen(port, () => { console.log(`Social Media Studio listening on http://localhost:${port}`); startScheduler(); });
