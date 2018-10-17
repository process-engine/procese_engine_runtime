'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Some of the earlier versions of the migrations apparently produced an unnamed foreign key on ProcessToken.
// These cannot be addressed during migration and will potentially break them, when using sqlite.
// We must therefore rebuild the ProcessTokenTable in order to remove that unnamed foreign key.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    // New Column for ExternalTasks
    await queryInterface.addColumn(
      'ExternalTasks',
      'identity',
      {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: ''
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
