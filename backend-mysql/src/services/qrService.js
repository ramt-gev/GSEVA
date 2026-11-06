const QRCode = require('qrcode');
const { QrPass } = require('../models');

// Create a QR pass for a person. zone_access is a plain JS array — Sequelize
// serializes it for the JSON column automatically (no manual
// JSON.stringify/::jsonb cast needed, unlike the Postgres backend).
// The QrPass model's isValidZoneList validator rejects anything that
// isn't a subset of zone1..zone4.
async function createQRPass(person_id, zone_access, valid_from, valid_until, group_size, pass_type = 'day_pass') {
  return QrPass.create({
    person_id,
    pass_type,
    zone_access,
    valid_from,
    valid_until,
    group_size: group_size || 1,
    is_active: true,
  });
}

// Generate QR code as base64 data URL (for inline display / email)
async function generateQRImage(qr_id) {
  return QRCode.toDataURL(qr_id, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

const generateQRDataURL = generateQRImage;

// Public PNG URL for WhatsApp delivery (served by /api/gate/image/:qr_id)
function getQRPublicURL(qr_id) {
  const base = process.env.APP_BASE_URL || 'http://localhost:3001';
  return `${base}/api/gate/image/${qr_id}`;
}

// Zone access defaults by person_type — source of truth is
// Docs/Phase_03_Gate_App_Live.md's getZoneAccess table (verified to match
// the Postgres backend's qrService.js exactly).
function getZoneAccess(person_type) {
  const zoneMap = {
    room_guest: ['zone1', 'zone2', 'zone3'],
    paid_day_visitor: ['zone1', 'zone2'],
    free_day_visitor: ['zone1', 'zone2'],
    course_student: ['zone1', 'zone2', 'zone3'],
    volunteer_seva: ['zone1', 'zone2', 'zone3'],
    sustainability_intern: ['zone1', 'zone2', 'zone3'],
    resident_staff: ['zone1', 'zone2', 'zone3', 'zone4'],
    staff_dependant: ['zone1', 'zone2', 'zone3'],
    brahmachari: ['zone1', 'zone2', 'zone3', 'zone4'],
    varishtha_vaishnava: ['zone1', 'zone2', 'zone3', 'zone4'],
    weekly_labourer_local: ['zone1', 'zone2', 'zone3'],
    weekly_labourer_outstation: ['zone1', 'zone2', 'zone3'],
    construction_labourer: ['zone1', 'zone2', 'zone3'],
    vendor_supplier: ['zone1'],
    corporate_tour_group: ['zone1', 'zone2'],
    vip_dignitary: ['zone1', 'zone2', 'zone3', 'zone4'],
  };
  return zoneMap[person_type] || ['zone1'];
}

module.exports = { createQRPass, generateQRImage, generateQRDataURL, getQRPublicURL, getZoneAccess };
