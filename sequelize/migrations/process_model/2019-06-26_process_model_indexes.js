'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Adding indexes to ProcessDefinitions table for each commonly used query operation
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Adding indexes to ProcessDefinitions table for each commonly used query operation');

    await queryInterface.addIndex('ProcessDefinitions', ['name']);
    await queryInterface.addIndex('ProcessDefinitions', ['hash']);
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
