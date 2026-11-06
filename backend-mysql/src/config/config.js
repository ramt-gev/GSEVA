// Sequelize CLI config (migrations/seeders). Kept separate from database.js
// (the runtime Sequelize instance) because sequelize-cli requires a plain
// object export, not a Sequelize instance.
require('dotenv').config();

const base = {
  username: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_DB_PASSWORD,
  database: process.env.MYSQL_DB_NAME,
  host: process.env.MYSQL_DB_HOST,
  port: process.env.MYSQL_DB_PORT,
  dialect: 'mysql',
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
