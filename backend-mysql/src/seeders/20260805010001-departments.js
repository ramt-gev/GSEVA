'use strict';
const { randomUUID } = require('crypto');

// Mirrors Docs/GEV_Database_Schema_v3_Final.sql STEP 10 seed (46 departments).
const DEPARTMENTS = [
  ['Annakshetra', 'ANNAK'],
  ['Kitchen (Festival & Daily Cooking)', 'KITCHEN'],
  ['Guest Hospitality', 'GHOSP'],
  ['Govindas Srinathji Bhavan (Cafe)', 'GSB'],
  ['Govindas Guest Area (Cafe)', 'GGA'],
  ['Dhanvantari Cafe (Ayurveda Dept)', 'DHAN'],
  ['Construction Department', 'CONST'],
  ['Maintenance Construction', 'MAINT'],
  ['Civil Material Purchases', 'CIVPURCH'],
  ['IT Infrastructure', 'IT_INFRA'],
  ['IT Software', 'IT_SW'],
  ['HR Department', 'HR'],
  ['Front Desk / Reception', 'FRONT'],
  ['Accounts & Finance', 'ACCOUNTS'],
  ['Estate Management', 'ESTATE'],
  ['Legal Liaisoning', 'LEGAL'],
  ['Central Purchase', 'CPURCH'],
  ['Godown Purchases', 'GODOWN'],
  ['Vehicle Department', 'VEHICLE'],
  ['Media Department', 'MEDIA'],
  ['ISKCON Govardhan Ashram (Guest Rooms)', 'ASHRAM'],
  ['Brahmachari Ashram', 'BRACHRAM'],
  ['Varishtha Vaishnava Care (VVSHCH)', 'VVSHCH'],
  ['Deity Worship Department', 'DEITY'],
  ['Deity Cooking', 'DEITYCOOK'],
  ['Temple Hall & Sound System', 'TEMPLE'],
  ['Kirtan Department', 'KIRTAN'],
  ['Health & Spiritual Care', 'HSC'],
  ['Festival Department', 'FESTIVAL'],
  ['Govardhan School of Yoga (incl. Int TTC)', 'GSYOGA'],
  ['Govardhan Ayurveda', 'AYUR'],
  ['GSEC - Govardhan School of Ed & Culture', 'GSEC'],
  ['Vidyapeetha (Long-term Spiritual)', 'VIDYA'],
  ['HRDI', 'HRDI'],
  ['GEMS - Govardhan English Medium School', 'GEMS'],
  ['Leadership Training Academy', 'LTA'],
  ['Sustainability', 'SUST'],
  ['SBT & Waste Management', 'SBT'],
  ['Goshala', 'GOSHA'],
  ['Nursery, Landscape & Vrindavan Forest', 'NURSERY'],
  ['Agriculture', 'AGRI'],
  ['Dioramas', 'DIORAMA'],
  ['Rural Development', 'RURAL'],
  ['Rural Education', 'RURALEDU'],
  ['CSR', 'CSR'],
  ['Security & Parking', 'SECUR'],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'departments',
      DEPARTMENTS.map(([dept_name, dept_code]) => ({
        dept_id: randomUUID(),
        dept_name,
        dept_code,
        is_active: true,
        created_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('departments', null, {});
  },
};
