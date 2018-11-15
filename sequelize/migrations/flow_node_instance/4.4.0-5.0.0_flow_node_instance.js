'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 4.4.0 and 5.0.0:
// - The column flowNodeType was added to store an FNIs BPMN type
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    console.log('Adding new flowNodeType column');
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'flowNodeType',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'eventType',
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
