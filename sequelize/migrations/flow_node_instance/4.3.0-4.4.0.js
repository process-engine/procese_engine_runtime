'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 4.3.0 and 4.4.0:
// - The column isSuspended was removed
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const flowNodeInstanceTableInfo = await queryInterface.describeTable('FlowNodeInstances');

    const migrationNotRequired = flowNodeInstanceTableInfo.isSuspended === undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');

      return Promise.resolve();
    }

    console.log('Removing old isSuspended column');
    await queryInterface.removeColumn('FlowNodeInstances', 'isSuspended');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
