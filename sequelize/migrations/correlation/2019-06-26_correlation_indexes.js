'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Adding indexes to Correaltion table for each commonly used query operation
module.exports = {
  up: async (queryInterface, Sequelize, dialect) => {

    console.log('Adding indexes to Correaltion table for each commonly used query operation');

    await queryInterface.addIndex('Correlations', ['correlationId']);
    await queryInterface.addIndex('Correlations', ['processModelId']);
    await queryInterface.addIndex('Correlations', ['processInstanceId']);
    await queryInterface.addIndex('Correlations', ['parentProcessInstanceId']);
    await queryInterface.addIndex('Correlations', ['state']);
    await queryInterface.addIndex('Correlations', ['correlationId', 'processInstanceId']);
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
