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

    await queryInterface.changeColumn(
      'FlowNodeInstances',
      'state',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );

    // TODO:
    // There is a weird bug in the query interface, when using sqlite, which drops all unique constraints whenever a column is removed.
    // We removed foreignKeys, so this should not be that much of a problem, but we need to re-add the unique constraint,
    // after isSuspended was removed.
    //
    // Note that this bug does not seem to affect postgres.

    const env = process.env.NODE_ENV || 'sqlite';
    if (env === 'sqlite') {
      await queryInterface.changeColumn(
        'FlowNodeInstances',
        'flowNodeInstanceId',
        {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        }
      );
    }
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
