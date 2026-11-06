'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PersonDependant extends Model {
    static associate(models) {
      PersonDependant.belongsTo(models.Person, { foreignKey: 'staff_person_id', as: 'staff_person' });
      PersonDependant.belongsTo(models.Person, { foreignKey: 'dependant_person_id', as: 'dependant_person' });
    }
  }

  PersonDependant.init(
    {
      dependant_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      staff_person_id: { type: DataTypes.CHAR(36), allowNull: false },
      dependant_person_id: { type: DataTypes.CHAR(36), allowNull: false },
      relation: {
        type: DataTypes.ENUM('spouse', 'son', 'daughter', 'father', 'mother', 'sibling', 'other'),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'PersonDependant',
      tableName: 'person_dependants',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return PersonDependant;
};
