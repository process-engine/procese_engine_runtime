'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Adding indexes to ExternalTask table for each commonly used query operation
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Adding indexes to ExternalTask table for each commonly used query operation');

    await queryInterface.addIndex('ExternalTasks', ['externalTaskId']);
    await queryInterface.addIndex('ExternalTasks', ['correlationId', 'processInstanceId', 'flowNodeInstanceId']);
    await queryInterface.addIndex('ExternalTasks', ['topic', 'state', 'lockExpirationTime']);
    await queryInterface.addIndex('ExternalTasks', ['processModelId']);
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
