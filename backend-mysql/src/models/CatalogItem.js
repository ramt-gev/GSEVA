'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CatalogItem extends Model {
    static associate(models) {
      CatalogItem.hasMany(models.MenuEntry, { foreignKey: 'catalog_item_id', as: 'menu_entries' });
      CatalogItem.hasMany(models.BldEntry, { foreignKey: 'catalog_item_id', as: 'bld_entries' });
    }
  }

  CatalogItem.init(
    {
      catalog_item_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      item_name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      default_unit: {
        type: DataTypes.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'),
        allowNull: false,
        defaultValue: 'KG',
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'CatalogItem',
      tableName: 'catalog_items',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return CatalogItem;
};
