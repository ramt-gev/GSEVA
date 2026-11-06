'use strict';
const { randomUUID } = require('crypto');

const ITEMS = [
  ['Rice', 'KG'], ['Khichdi Rice', 'KG'], ['Dal Tadka', 'KG'], ['Chapati', 'PIECE'],
  ['Mixed Veg Sabzi', 'KG'], ['Curd', 'LITRE'], ['Halwa', 'KG'], ['Puri', 'PIECE'],
  ['Sweet Rice (Kheer)', 'KG'], ['Buttermilk', 'LITRE'],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'catalog_items',
      ITEMS.map(([item_name, default_unit]) => ({
        catalog_item_id: randomUUID(),
        item_name,
        default_unit,
        is_active: true,
        created_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('catalog_items', { item_name: ITEMS.map((i) => i[0]) });
  },
};
