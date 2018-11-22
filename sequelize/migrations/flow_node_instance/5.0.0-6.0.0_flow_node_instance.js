'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 4.4.0 and 5.0.0:
// - The column previousFlowNodeInstanceId was added to store an FNIs BPMN type
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    console.log('Adding new previousFlowNodeInstanceId column');
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'previousFlowNodeInstanceId',
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
