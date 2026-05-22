require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const path = require('path');

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSP off — dev HTML uses inline scripts
app.use(cors());
app.use(express.json());

// Static assets (logo etc.)
app.use('/static', express.static(path.join(__dirname, '../public')));

// Serve frontend HTML files
const FRONTEND = path.join(__dirname, '../../Docs');
app.get('/',          (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));
app.get('/gate',      (req, res) => res.sendFile(path.join(FRONTEND, 'GEV_Gate_Tablet_App_v2.html')));
app.get('/canteen',   (req, res) => res.sendFile(path.join(FRONTEND, 'GEV_Annakshetra_Canteen_App.html')));
app.get('/admin',     (req, res) => res.sendFile(path.join(FRONTEND, 'GEV_Admin_Portal_v2.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(FRONTEND, 'GEV_Dashboard_Reports.html')));
app.get('/register',  (req, res) => res.sendFile(path.join(FRONTEND, 'GEV_Smart_Registration_Page.html')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/persons',  require('./routes/persons'));
app.use('/api/gate',     require('./routes/gate'));
app.use('/api/register', require('./routes/registration'));
app.use('/api/meals',    require('./routes/meals'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/ezee',     require('./routes/ezee'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'GEV ICMS', version: '1.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const { startForecastCron }  = require('./services/forecastService');
const { startGreythrSync }   = require('./services/greythrService');
const { startHealthCheck }   = require('./services/healthService');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GEV ICMS API running on port ${PORT}`);
  startForecastCron();
  startGreythrSync();
  startHealthCheck();
});
