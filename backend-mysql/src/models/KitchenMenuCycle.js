'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KitchenMenuCycle extends Model {
    static associate(models) {
      KitchenMenuCycle.hasMany(models.MenuEntry, { foreignKey: 'cycle_id', as: 'menu_entries' });
      KitchenMenuCycle.belongsTo(models.SystemUser, { foreignKey: 'locked_by', as: 'locker' });
    }
  }

  KitchenMenuCycle.init(
    {
      cycle_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
      locked_by: { type: DataTypes.CHAR(36), allowNull: true },
      locked_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'KitchenMenuCycle',
      tableName: 'kitchen_menu_cycles',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return KitchenMenuCycle;
};
