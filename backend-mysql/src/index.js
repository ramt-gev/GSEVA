require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');
const openapiSpec = require('./docs/openapi');

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSP off — dev HTML uses inline scripts
app.use(cors());

// The Razorpay webhook needs the raw request body for HMAC verification
// (routes/registration.js applies express.raw() on that one path). Express
// body-parser middleware checks req._body and no-ops if a body was already
// parsed — so a global express.json() ahead of it would silently swallow
// the raw bytes first, leaving the webhook handler with an already-parsed
// object instead of a Buffer (breaking every signature check). Confirmed
// this exact ordering bug is also present in gev-icms-backend/src/index.js
// — worth fixing there too. Skip the global JSON parser for that one path.
app.use((req, res, next) => {
  if (req.path === '/api/register/payment/webhook') return next();
  express.json()(req, res, next);
});

// Static assets (logo etc.)
app.use('/static', express.static(path.join(__dirname, '../public')));

// The real frontend is the Vite/React app in ../frontend (dev server on
// :5175, or a built dist/ in production) — it owns /, /gate, /admin, etc.
// entirely client-side. This backend used to also sendFile a set of
// prototype HTML pages from a sibling Docs/ folder that doesn't exist in
// this project, so every one of those routes 500'd. Replaced with Swagger
// docs — a working, useful thing to land on when hitting the API origin
// directly instead of the frontend's own port.
app.get('/', (req, res) => res.redirect('/api-docs'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/persons', require('./routes/persons'));
app.use('/api/gate', require('./routes/gate'));
app.use('/api/register', require('./routes/registration'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ezee', require('./routes/ezee'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/kitchen', require('./routes/kitchen'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'GEV ICMS (MySQL)', version: '1.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

const { startForecastCron } = require('./services/forecastService');
const { startGreythrSync } = require('./services/greythrService');
const { startHealthCheck } = require('./services/healthService');

const PORT = process.env.PORT || 3001;

async function start() {
  await sequelize.authenticate();
  console.log('Database connection established (MySQL/MariaDB).');

  app.listen(PORT, () => {
    console.log(`GEV ICMS API (MySQL) running on port ${PORT}`);
    startForecastCron();
    startGreythrSync();
    startHealthCheck();
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
