const axios = require('axios');

const BASE = process.env.INTERAKT_BASE_URL;
const KEY  = process.env.INTERAKT_API_KEY;

function normalizePhone(mobile) {
  return mobile.replace('+91', '').replace(/\s/g, '');
}

async function sendMessage(mobile, message) {
  if (!KEY || KEY === 'REPLACE_ME') {
    console.log(`[WhatsApp MOCK] → ${mobile}: ${message.substring(0, 60)}...`);
    return;
  }
  try {
    await axios.post(`${BASE}/message/`, {
      countryCode:  '+91',
      phoneNumber:  normalizePhone(mobile),
      callbackData: 'gev-icms',
      type:         'Text',
      data:         { message }
    }, { headers: { Authorization: `Basic ${KEY}` } });
    console.log(`WhatsApp sent to ${mobile}`);
  } catch (err) {
    console.error('WhatsApp send error:', err.response?.data || err.message);
  }
}

async function sendQRPass(mobile, qr_image_url, person_name, valid_until) {
  if (!KEY || KEY === 'REPLACE_ME') {
    console.log(`[WhatsApp MOCK] QR pass for ${person_name} → ${mobile} (${qr_image_url})`);
    return;
  }
  try {
    await sendMessage(mobile,
      `Hare Krishna ${person_name}!\n\nYour GEV Campus QR Pass is ready.\n` +
      `Valid until: ${valid_until}\n\n` +
      `Show this QR at the gate. Jai Govardhan! 🙏`
    );
    await axios.post(`${BASE}/message/`, {
      countryCode:  '+91',
      phoneNumber:  normalizePhone(mobile),
      callbackData: 'gev-qr-pass',
      type:         'Image',
      data: {
        mediaUrl: qr_image_url,
        caption:  `GEV Campus QR Pass — ${person_name}`
      }
    }, { headers: { Authorization: `Basic ${KEY}` } });
    console.log(`QR pass sent to ${mobile} for ${person_name}`);
  } catch (err) {
    console.error('WhatsApp QR send error:', err.response?.data || err.message);
  }
}

async function sendNightlyForecast(mobile, forecastData) {
  const msg =
    `GEV Annakshetra — Tomorrow's Forecast\n\n` +
    `Breakfast: ${forecastData.breakfast}\n` +
    `Free Lunch: ${forecastData.free_lunch} (est.)\n` +
    `Dinner: ${forecastData.dinner}\n\n` +
    `Breakdown:\n` +
    `Staff: ${forecastData.staff}\n` +
    `Volunteers: ${forecastData.volunteers}\n` +
    `Labourers: ${forecastData.labourers}\n` +
    `Students: ${forecastData.students}\n\n` +
    `Jai Govardhan! 🙏`;
  await sendMessage(mobile, msg);
}

module.exports = { sendMessage, sendQRPass, sendNightlyForecast };
