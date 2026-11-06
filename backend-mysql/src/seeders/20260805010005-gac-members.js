'use strict';
const { randomUUID } = require('crypto');

// Mirrors Docs/GEV_Database_Schema_v3_Final.sql STEP 9 seed (16 GAC members).
const GAC_MEMBERS = [
  ['Sanatkumar P', 'GAC Member 1 — Rural Dev, Goshala, Agriculture'],
  ['Gauranga P', 'GAC Member 2 — Kitchen, Annakshetra, Guest Hospitality, Construction(co)'],
  ['Vasudev P', 'GAC Member 3 — Project Final Authority, Accounts, Vehicle, Purchase'],
  ['Sri Gaurcaran P', 'GAC Member 4 — IT/HR Director, Estate, Civil Purchase, Media'],
  ['Adikeshav P', 'GAC Member 5 — School of Yoga(co), Ayurveda, Community Dev'],
  ['Caitanyarupa P', 'GAC Member 6 — Sustainability, Seva Office, SBT, Volunteering'],
  ['Gauranga Darshan P', 'GAC Member 7 — GSEC, Shastric Education, Vidyapeetha'],
  ['Devarshi Narad P', 'GAC Member 8 — Local PR, Goshala(co), Legal Liaisoning'],
  ['Sri Gurucaran P', 'GAC Member 9 — ISKCON Ashram, School of Yoga, Maintenance, Govindas'],
  ['Madhav Gaur P', 'GAC Member 10 — Dioramas, SBT(co), Nursery & VF, Food Stalls'],
  ['Maha Bhagavat P', 'GAC Member 11 — Brahmachari Ashram, Temple Hall, HRDI, Construction(co)'],
  ['Ajit Mukund P', 'GAC Member 12 — GEMS, HRDI(co), Campus Preaching, Book Distribution'],
  ['Sushant Nitai P', 'GAC Member 13 — Deity Worship, VF Temples, Festivals, Deity Cooking(co)'],
  ['Premlila M', 'GAC Member 14 — Health & Spiritual Care, POSH & CPT'],
  ['Barsana Kumari M', 'GAC Member 15 — Volunteering(co), Kirtan(co), Deity Cooking(co)'],
  ['HariPriya Radha M', 'GAC Member 16 — ISKCON Ashram(co), Gift Shops, IGA Volunteering, Media(co)'],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'gac_members',
      GAC_MEMBERS.map(([gac_member_name, gac_position]) => ({
        gac_id: randomUUID(),
        gac_member_name,
        gac_position,
        is_active: true,
        created_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('gac_members', null, {});
  },
};
