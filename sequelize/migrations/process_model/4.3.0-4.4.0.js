'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 4.3.0 and 4.4.0:
// - New Field: ProcessToken.hash: Stores the hash for a given process models xml. This field is used to implement versioning
// - Remove "unique" constraint from "name", to allow versioning
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const processDefinitionTableInfo = await queryInterface.describeTable('ProcessDefinitions');

    const migrationNotRequired = processDefinitionTableInfo.hash !== undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');

      return Promise.resolve();
    }

    // New Column for ProcessDefinitions
    await queryInterface.addColumn(
      'ProcessDefinitions',
      'hash',
      {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      }
    );

    // Remove unique constraint from name
    await queryInterface.changeColumn(
      'ProcessDefinitions',
      'name',
      {
        type: Sequelize.STRING,
        allowNull: false,
        unique: false,
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    return Promise.resolve();
  },
};
