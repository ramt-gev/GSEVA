const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../../public/logo.png');

// Brand colours
const BROWN = '#703d1a';
const PEACH_BG = '#f8eee4';
const PEACH_WARM = '#c98767';
const WHITE = '#ffffff';
const CHARCOAL = '#2B2B2B';
const LIGHT_GREY = '#e8ddd4';

const ZONE_COLORS = {
  zone1: '#556B2F',
  zone2: '#703d1a',
  zone3: '#1A4F8A',
  zone4: '#5A3A9E',
};

const PASS_TYPE_LABELS = {
  day_pass: 'Day Pass',
  stay_pass: 'Stay Pass',
  seva_pass: 'Seva Pass',
  staff_pass: 'Staff Pass',
  vip_pass: 'VIP Pass',
};

const PERSON_TYPE_LABELS = {
  room_guest: 'Room Guest',
  paid_day_visitor: 'Day Visitor',
  free_day_visitor: 'Day Visitor',
  course_student: 'Course Student',
  volunteer_seva: 'Seva Volunteer',
  sustainability_intern: 'Sustainability Intern',
  resident_staff: 'Resident Staff',
  staff_dependant: 'Staff Dependant',
  brahmachari: 'Brahmachari',
  varishtha_vaishnava: 'Varishtha Vaishnava',
  weekly_labourer_local: 'Weekly Labourer',
  weekly_labourer_outstation: 'Weekly Labourer',
  construction_labourer: 'Construction Labourer',
  vendor_supplier: 'Vendor',
  corporate_tour_group: 'Corporate Group',
  vip_dignitary: 'VIP / Dignitary',
};

async function generatePass(passData) {
  const {
    qr_id, full_name, person_type, pass_type, zone_access,
    valid_from, valid_until, dept_name, group_size,
  } = passData;

  // Card dimensions (A6 portrait — 105mm x 148mm in points)
  const W = 298;
  const H = 420;

  const doc = new PDFDocument({
    size: [W, H],
    margin: 0,
    info: {
      Title: `GEV Campus Pass — ${full_name}`,
      Author: 'Govardhan EcoVillage ICMS',
      Subject: 'Campus Access Pass',
    },
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // HEADER BAND
  doc.rect(0, 0, W, 68).fill(BROWN);

  try {
    doc.roundedRect(10, 8, 52, 52, 8).fill(WHITE);
    doc.image(LOGO_PATH, 13, 11, { height: 46, fit: [46, 46] });
  } catch {}

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(13)
    .text('Govardhan EcoVillage', 70, 16, { width: W - 80 });

  doc.fillColor(PEACH_WARM).font('Helvetica-Bold').fontSize(9)
    .text((PASS_TYPE_LABELS[pass_type] || 'Campus Pass').toUpperCase(), 70, 34, { width: W - 80 });

  doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(7.5)
    .text('ISKCON · Wada, Maharashtra', 70, 48, { width: W - 80 });

  // QR CODE
  const qrBuffer = await QRCode.toBuffer(qr_id, {
    width: 140,
    margin: 1,
    color: { dark: BROWN, light: WHITE },
    errorCorrectionLevel: 'H',
  });

  const qrY = 80;
  doc.roundedRect((W - 148) / 2, qrY - 4, 148, 148, 8).fill(WHITE);
  doc.image(qrBuffer, (W - 140) / 2, qrY, { width: 140, height: 140 });

  // PERSON DETAILS
  const detailY = qrY + 156;

  doc.fillColor(CHARCOAL).font('Helvetica-Bold').fontSize(15)
    .text(full_name || '—', 0, detailY, { width: W, align: 'center' });

  doc.fillColor(BROWN).font('Helvetica').fontSize(9.5)
    .text(PERSON_TYPE_LABELS[person_type] || person_type, 0, detailY + 19, { width: W, align: 'center' });

  if (dept_name) {
    doc.fillColor('#9a8a7a').font('Helvetica').fontSize(8.5)
      .text(dept_name, 0, detailY + 32, { width: W, align: 'center' });
  }

  // DIVIDER
  const divY = detailY + (dept_name ? 50 : 42);
  doc.moveTo(18, divY).lineTo(W - 18, divY).strokeColor(LIGHT_GREY).lineWidth(0.5).stroke();

  // ZONE BADGES
  const zones = Array.isArray(zone_access)
    ? zone_access
    : (typeof zone_access === 'string' ? JSON.parse(zone_access) : []);

  const badgeY = divY + 10;
  const bW = 60;
  const bH = 16;
  const bGap = 6;
  const totalBW = zones.length * bW + (zones.length - 1) * bGap;
  let bX = (W - totalBW) / 2;

  zones.forEach((zone) => {
    const col = ZONE_COLORS[zone] || BROWN;
    doc.roundedRect(bX, badgeY, bW, bH, 4).fill(col);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7)
      .text(zone.replace('zone', 'Zone '), bX, badgeY + 4.5, { width: bW, align: 'center' });
    bX += bW + bGap;
  });

  // VALIDITY
  const validY = badgeY + bH + 12;
  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  doc.fillColor('#9a8a7a').font('Helvetica').fontSize(7.5)
    .text('VALID', 18, validY, { continued: true })
    .fillColor(CHARCOAL).font('Helvetica-Bold')
    .text(`  ${fmt(valid_from)}  →  ${valid_until ? fmt(valid_until) : 'Permanent'}`, { align: 'left' });

  if (group_size && group_size > 1) {
    doc.fillColor('#9a8a7a').font('Helvetica').fontSize(7.5)
      .text(`GROUP SIZE: ${group_size} persons`, 18, validY + 13);
  }

  // PASS ID
  const idY = H - 42;
  doc.moveTo(18, idY - 6).lineTo(W - 18, idY - 6).strokeColor(LIGHT_GREY).lineWidth(0.5).stroke();

  doc.fillColor('#b8a898').font('Helvetica').fontSize(6.5)
    .text(`PASS ID: ${qr_id}`, 18, idY, { width: W - 36 });

  // FOOTER BAND
  doc.rect(0, H - 22, W, 22).fill(PEACH_BG);
  doc.fillColor(BROWN).font('Helvetica-Bold').fontSize(8)
    .text('Hare Krishna  ·  ISKCON Govardhan EcoVillage, Wada', 0, H - 15, { width: W, align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

module.exports = { generatePass };
