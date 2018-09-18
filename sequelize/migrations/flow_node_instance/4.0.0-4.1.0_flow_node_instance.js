'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Some of the earlier versions of the migrations apparently produced an unnamed foreign key on ProcessToken.
// These cannot be addressed during migration and will potentially break them, when using sqlite.
// We must therefore rebuild the ProcessTokenTable in order to remove that unnamed foreign key.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    const env = process.env.NODE_ENV || 'sqlite';

    // Note that this bug does not seem to affect postgres.
    if (env !== 'sqlite') {
      return Promise.resolve();
    }

    console.log('Repairing the ProcessTokenTable');

    // New Column for ProcessToken
    await queryInterface.addColumn(
      'ProcessTokens',
      'flowNodeInstanceId_2',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );

    await queryInterface.sequelize.query('INSERT INTO ProcessTokens (flowNodeInstanceId_2) SELECT flowNodeInstanceId FROM ProcessTokens');
    await queryInterface.removeColumn('ProcessTokens', 'flowNodeInstanceId');
    await queryInterface.renameColumn('ProcessTokens', 'flowNodeInstanceId_2', 'flowNodeInstanceId');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
