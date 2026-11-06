'use strict';
const { randomUUID } = require('crypto');

// Mirrors Docs/GEV_Database_Schema_v3_Final.sql STEP 9 seed (46 dept_hods,
// one per department seeded in 20260805010001-departments.js).
const DEPT_HODS = [
  ['ANNAK', 'Anand Prem P', 'Gauranga P', 'Anand Prem P'],
  ['KITCHEN', 'Hari Guru P', 'Gauranga P', 'Hari Guru P'],
  ['GHOSP', 'Mohan Villas P', 'Gauranga P', 'Mohan Villas P'],
  ['GSB', 'Ramesh P', 'Vasudev P', 'Ramesh P'],
  ['GGA', 'Prasad Panda P', 'Sri Gurucaran P', 'Prasad Panda P'],
  ['DHAN', 'Ganesh Ghosh P', 'Adikeshav P (Ayurveda Dept)', 'Ganesh Ghosh P'],
  ['CONST', 'Anandnimai P', 'Gauranga P / Vasudev P / Sri Gaurcaran P / Maha Bhagavat P', 'Anandnimai P'],
  ['MAINT', 'Laxmanpran P', 'Sri Gurucaran P', 'Laxmanpran P'],
  ['CIVPURCH', 'Subal Sakha P', 'Sri Gaurcaran P', 'Subal Sakha P'],
  ['IT_INFRA', 'Radhashyamsundar P', 'Sri Gaurcaran P', 'Sri Gaurcaran P'],
  ['IT_SW', 'Ram Prabhu', 'Sri Gaurcaran P', 'Ram Prabhu'],
  ['HR', 'Radhashyamsundar P', 'Sri Gaurcaran P', 'Sri Gaurcaran P'],
  ['FRONT', 'Prasad Panda P', 'Sri Gurucaran P', 'Prasad Panda P'],
  ['ACCOUNTS', 'Gauranga Lila P', 'Vasudev P', 'Gauranga Lila P'],
  ['ESTATE', 'Sri Gaurcaran P', 'Sri Gaurcaran P', 'Sri Gaurcaran P'],
  ['LEGAL', 'Audarya Caitanya P', 'Devarshi Narad P', 'Audarya Caitanya P'],
  ['CPURCH', 'Braj Sakha P', 'Vasudev P', 'Braj Sakha P'],
  ['GODOWN', 'Parth Sakha P', 'Sri Gaurcaran P', 'Parth Sakha P'],
  ['VEHICLE', 'Vaishnav Sevak P', 'Vasudev P', 'Vaishnav Sevak P'],
  ['MEDIA', 'Ganganath Caitanya P', 'Sri Gaurcaran P / HariPriya Radha M', 'Ganganath Caitanya P'],
  ['ASHRAM', 'Veera Arjuna P', 'Sri Gurucaran P / HariPriya Radha M', 'Veera Arjuna P'],
  ['BRACHRAM', 'Madhav Prem P', 'Maha Bhagavat P', 'Madhav Prem P'],
  ['VVSHCH', 'Achyuta Avtar P (Achyut Patil)', 'Gauranga P / Adikeshav P', 'Achyut Patil'],
  ['DEITY', 'Deity Worship Committee', 'Sushant Nitai P', 'Sushant Nitai P'],
  ['DEITYCOOK', 'Vrindavan Priti M', 'Sushant Nitai P / Barsana Kumari M', 'Vrindavan Priti M'],
  ['TEMPLE', 'Sri Kesavanand P', 'Maha Bhagavat P', 'Sri Kesavanand P'],
  ['KIRTAN', 'Jay Sacinandan P', 'Maha Bhagavat P / Barsana Kumari M', 'Jay Sacinandan P'],
  ['HSC', 'Sridhar Nimai P', 'Premlila M', 'Sridhar Nimai P'],
  ['FESTIVAL', 'Festival Committee', 'Sushant Nitai P (Sanatkumar P Chair)', 'Sanatkumar P'],
  ['GSYOGA', 'Priya Caitanya P', 'Sri Gurucaran P', 'Priya Caitanya P'],
  ['AYUR', 'Dr. Sudheesh', 'Adikeshav P', 'Dr. Sudheesh'],
  ['GSEC', 'Gauranga Darshan P', 'Gauranga Darshan P', 'Gauranga Darshan P'],
  ['VIDYA', 'Gaurangabihari P (HOD) / Gauranga Darshan P (Dean)', 'Gauranga Darshan P', 'Gaurangabihari P'],
  ['HRDI', 'Abhimanyu Pran P', 'Ajit Mukund P / Maha Bhagavat P', 'Abhimanyu Pran P'],
  ['GEMS', 'Amolcaitanya P', 'Premlila M', 'Amolcaitanya P'],
  ['LTA', 'Mohan Vilas P', 'Gauranga P', 'Mohan Vilas P'],
  ['SUST', 'Caitanyarup P', 'Caitanyarupa P', 'Caitanyarup P'],
  ['SBT', 'Ganga Narayan P', 'Caitanyarupa P / Madhav Gaur P', 'Ganga Narayan P'],
  ['GOSHA', 'Srinandanandan P', 'Sanatkumar P / Devarshi Narad P', 'Srinandanandan P'],
  ['NURSERY', 'Abhay Gauranga P', 'Sanatkumar P / Madhav Gaur P', 'Abhay Gauranga P'],
  ['AGRI', 'Prem Prada P', 'Sanatkumar P', 'Prem Prada P'],
  ['DIORAMA', 'Under Madhav Gaur P', 'Madhav Gaur P / Sushant Nitai P', 'Madhav Gaur P'],
  ['RURAL', 'Jadu Thakur P & Mohan Nimai P', 'Sanatkumar P', 'Mohan Nimai P'],
  ['RURALEDU', 'Nitai Caitanya P', 'Sanatkumar P', 'Nitai Caitanya P'],
  ['CSR', 'Anand Caitanya P', 'Gauranga P', 'Anand Caitanya P'],
  ['SECUR', 'Premanjan P', 'Direct', 'Premanjan P'],
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'dept_hods',
      DEPT_HODS.map(([dept_code, hod_name, gac_member, project_contact]) => ({
        hod_id: randomUUID(),
        dept_code,
        hod_name,
        gac_member,
        project_contact,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('dept_hods', null, {});
  },
};
