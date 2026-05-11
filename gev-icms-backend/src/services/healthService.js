const cron = require('node-cron');
const pool = require('../db');
const { sendMessage } = require('./whatsappService');

function startHealthCheck() {
  const adminMobile = process.env.ADMIN_MOBILE;
  if (!adminMobile) {
    console.log('Health check: ADMIN_MOBILE not set — alerts disabled');
  }

  // Every 5 minutes: verify DB is reachable
  cron.schedule('*/5 * * * *', async () => {
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      console.error('Health check FAILED — DB unreachable:', err.message);
      if (adminMobile) {
        sendMessage(
          adminMobile,
          `🚨 GEV ICMS ALERT: Database connection failed at ${new Date().toLocaleTimeString('en-IN')} IST. Check server immediately.`
        ).catch(e => console.error('Health alert WhatsApp failed:', e.message));
      }
    }
  });

  console.log('Health check scheduled — every 5 minutes');
}

module.exports = { startHealthCheck };
