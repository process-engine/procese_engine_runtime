'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Change type of column "error" to "TEXT", since "STRING" is insufficent when used in conjunction with postgres.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Changing type of "error" column to TEXT');

    await queryInterface.changeColumn(
      'FlowNodeInstances',
      'error',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
