'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PreachingProgramEntry extends Model {
    static associate(models) {
      PreachingProgramEntry.belongsTo(models.CatalogItem, { foreignKey: 'catalog_item_id', as: 'item' });
      PreachingProgramEntry.belongsTo(models.SystemUser, { foreignKey: 'created_by', as: 'creator' });
    }
  }

  PreachingProgramEntry.init(
    {
      preaching_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      for_date: { type: DataTypes.DATEONLY, allowNull: false },
      preacher_name: { type: DataTypes.STRING(255), allowNull: false },
      people_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      catalog_item_id: { type: DataTypes.CHAR(36), allowNull: false },
      created_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'PreachingProgramEntry',
      tableName: 'preaching_program_entries',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return PreachingProgramEntry;
};
