'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Change type of column "previousFlowNodeInstanceId" to "TEXT", because "STRING" is insufficent when used in conjunction with postgres.
// - This is relevant when dealing with ParallelJoinGateways, which can have numerous such IDs.
module.exports = {
  up: async (queryInterface, Sequelize, dialect) => {

    console.log('Changing type of "previousFlowNodeInstanceId" column to TEXT');

    await queryInterface.changeColumn(
      'FlowNodeInstances',
      'previousFlowNodeInstanceId',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    );
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
