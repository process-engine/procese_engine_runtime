'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 5.0.0 and 6.0.0:
// - The column eventType was added to store an FNIs BPMN EvntType (Message, Signal, etc.)
// - The column previousFlowNodeInstanceId was added to store an FNIs BPMN type
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const flowNodeInstanceTableInfo = await queryInterface.describeTable('FlowNodeInstances');

    const migrationNotRequired = flowNodeInstanceTableInfo.flowNodeName !== undefined
                              && flowNodeInstanceTableInfo.flowNodeLane !== undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    console.log('Adding new flowNodeName column');
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'flowNodeName',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );

    console.log('Adding new flowNodeLane column');
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'flowNodeLane',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};