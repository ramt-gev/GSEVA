'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuEntry extends Model {
    static associate(models) {
      MenuEntry.belongsTo(models.Department, { foreignKey: 'dept_id', as: 'department' });
      MenuEntry.belongsTo(models.CatalogItem, { foreignKey: 'catalog_item_id', as: 'item' });
      MenuEntry.belongsTo(models.KitchenMenuCycle, { foreignKey: 'cycle_id', as: 'cycle' });
      MenuEntry.belongsTo(models.SystemUser, { foreignKey: 'created_by', as: 'creator' });
    }
  }

  MenuEntry.init(
    {
      menu_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      for_date: { type: DataTypes.DATEONLY, allowNull: false },
      dept_id: { type: DataTypes.CHAR(36), allowNull: false },
      meal_type: { type: DataTypes.ENUM('BREAKFAST', 'LUNCH', 'DINNER'), allowNull: false },
      catalog_item_id: { type: DataTypes.CHAR(36), allowNull: false },
      cycle_id: { type: DataTypes.CHAR(36), allowNull: true },
      created_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'MenuEntry',
      tableName: 'menu_entries',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return MenuEntry;
};
