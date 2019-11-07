'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Adding indexes to ExternalTask table for each commonly used query operation
module.exports = {
  up: async (queryInterface, Sequelize, dialect) => {

    console.log('Adding indexes to ExternalTask table for each commonly used query operation');

    // NOTE: Mysql has a limit on the length of index names, so we must shorten those that use many columns.
    await queryInterface.addIndex('ExternalTasks', ['externalTaskId'], {name: 'ExternalTasks_externalTaskId_Index'});
    await queryInterface.addIndex('ExternalTasks', ['correlationId', 'processInstanceId', 'flowNodeInstanceId'], {name: 'ExternalTasks_piId_cId_fniId_Index'});
    await queryInterface.addIndex('ExternalTasks', ['topic', 'state', 'lockExpirationTime']);
    await queryInterface.addIndex('ExternalTasks', ['processModelId']);
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
