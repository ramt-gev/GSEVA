require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const app = express();

app.use(helmet());
app.use(cors());                 // permissive in dev — tighten origins in prod
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/persons',  require('./routes/persons'));
app.use('/api/gate',     require('./routes/gate'));
app.use('/api/register', require('./routes/registration'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'GEV ICMS', version: '1.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GEV ICMS API running on port ${PORT}`);
});
