'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Added the "identity" column.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const externalTaskTableInfo = await queryInterface.describeTable('ExternalTasks');

    const migrationNotRequired = externalTaskTableInfo.identity !== undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    // New Column for ExternalTasks
    await queryInterface.addColumn(
      'ExternalTasks',
      'identity',
      {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      }
    );

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
