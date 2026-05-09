const QRCode = require('qrcode');
const pool   = require('../db');

// Create a QR pass for a person.
// pass_type is required (NOT NULL in schema). zone_access goes in as JSONB —
// MUST be JSON-stringified so node-pg sends it as JSONB, not TEXT[].
async function createQRPass(
  person_id, zone_access, valid_from, valid_until, group_size,
  pass_type = 'day_pass'
) {
  const result = await pool.query(
    `INSERT INTO qr_passes
      (person_id, pass_type, zone_access, valid_from, valid_until, group_size, is_active)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, true)
     RETURNING *`,
    [
      person_id,
      pass_type,
      JSON.stringify(zone_access),
      valid_from,
      valid_until,
      group_size || 1,
    ]
  );
  return result.rows[0];
}

// Generate QR code as base64 data URL (for inline display / email)
async function generateQRImage(qr_id) {
  return await QRCode.toDataURL(qr_id, {
    width: 400, margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

const generateQRDataURL = generateQRImage;

// Public PNG URL for WhatsApp delivery (served by /api/gate/image/:qr_id)
function getQRPublicURL(qr_id) {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  return `${base}/api/gate/image/${qr_id}`;
}

// Zone access defaults by person_type
function getZoneAccess(person_type) {
  const zoneMap = {
    room_guest:                 ['zone1','zone2','zone3'],
    paid_day_visitor:           ['zone1','zone2'],
    free_day_visitor:           ['zone1','zone2'],
    course_student:             ['zone1','zone2','zone3'],
    volunteer_seva:             ['zone1','zone2','zone3'],
    sustainability_intern:      ['zone1','zone2','zone3'],
    resident_staff:             ['zone1','zone2','zone3','zone4'],
    staff_dependant:            ['zone1','zone2','zone3'],
    brahmachari:                ['zone1','zone2','zone3','zone4'],
    varishtha_vaishnava:        ['zone1','zone2','zone3','zone4'],
    weekly_labourer_local:      ['zone1','zone2','zone3'],
    weekly_labourer_outstation: ['zone1','zone2','zone3'],
    construction_labourer:      ['zone1','zone2','zone3'],
    vendor_supplier:            ['zone1'],
    corporate_tour_group:       ['zone1','zone2'],
    vip_dignitary:              ['zone1','zone2','zone3','zone4'],
  };
  return zoneMap[person_type] || ['zone1'];
}

module.exports = { createQRPass, generateQRImage, generateQRDataURL, getQRPublicURL, getZoneAccess };
