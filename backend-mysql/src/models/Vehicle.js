'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vehicle extends Model {
    static associate(models) {
      Vehicle.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
    }
  }

  Vehicle.init(
    {
      vehicle_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: true },
      vehicle_number: { type: DataTypes.STRING(50), allowNull: false },
      vehicle_type: { type: DataTypes.STRING(50), allowNull: true },
      driver_name: { type: DataTypes.STRING(255), allowNull: true },
      purpose: { type: DataTypes.STRING(255), allowNull: true },
      is_permanent: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_gev_owned: { type: DataTypes.BOOLEAN, defaultValue: false },
      entry_time: { type: DataTypes.DATE, allowNull: true },
      exit_time: { type: DataTypes.DATE, allowNull: true },
      parking_zone: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      sequelize,
      modelName: 'Vehicle',
      tableName: 'vehicles',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return Vehicle;
};
