'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Added the "identity" column.
// Added the "version" column.
// Added the "processModelId" column.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const externalTaskTableInfo = await queryInterface.describeTable('ExternalTasks');

    const migrationNotRequired = externalTaskTableInfo.identity !== undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    await queryInterface.addColumn(
      'ExternalTasks',
      'identity',
      {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      }
    );

    await queryInterface.addColumn(
      'ExternalTasks',
      'version',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    );

    await queryInterface.addColumn(
      'ExternalTasks',
      'processModelId',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
