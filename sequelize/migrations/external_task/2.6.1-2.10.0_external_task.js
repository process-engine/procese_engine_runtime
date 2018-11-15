'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Added the "processModelId" column.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    // New Column for ExternalTasks
    await queryInterface.addColumn(
      'ExternalTasks',
      'processModelId',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
