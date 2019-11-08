'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Adding optional identity column to ProcessDefinitions
// - This is mostly done to help migrating to the AtlasEngine, which will require this column to be present.
// - It is not likely that the ProcessEngine will make use of this column though.
module.exports = {
  up: async (queryInterface, Sequelize, dialect) => {

    console.log('Adding optional identity column to ProcessDefinition table');

    await queryInterface.addColumn(
      'ProcessDefinitions',
      'identity',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
