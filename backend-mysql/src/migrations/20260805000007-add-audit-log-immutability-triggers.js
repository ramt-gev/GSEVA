'use strict';

// Postgres source uses CREATE RULE ... DO INSTEAD NOTHING (silent no-op).
// MySQL/MariaDB have no RULE equivalent; BEFORE triggers that SIGNAL an
// error are used instead — stricter than a silent no-op, not weaker. No app
// code ever attempts UPDATE/DELETE on audit_log (the model/service layer
// won't expose one either), so this is a pure defense-in-depth backstop
// against direct edits (e.g. via phpMyAdmin).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
      FOR EACH ROW BEGIN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log rows are immutable';
      END
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
      FOR EACH ROW BEGIN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log rows are immutable';
      END
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS audit_log_no_update`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS audit_log_no_delete`);
  },
};
