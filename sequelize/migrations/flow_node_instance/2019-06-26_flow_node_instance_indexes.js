'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Adding indexes to FlowNodeInstance and ProcessToken tables for each commonly used query operation
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Adding indexes to FlowNodeInstance and ProcessToken tables for each commonly used query operation');

    await queryInterface.addIndex('FlowNodeInstances', ['correlationId']);
    await queryInterface.addIndex('FlowNodeInstances', ['flowNodeId']);
    await queryInterface.addIndex('FlowNodeInstances', ['flowNodeInstanceId']);
    await queryInterface.addIndex('FlowNodeInstances', ['processModelId']);
    await queryInterface.addIndex('FlowNodeInstances', ['processInstanceId']);
    await queryInterface.addIndex('FlowNodeInstances', ['state']);
    await queryInterface.addIndex('FlowNodeInstances', ['correlationId', 'processModelId']);
    await queryInterface.addIndex('FlowNodeInstances', ['correlationId', 'processModelId', 'flowNodeId']);
    await queryInterface.addIndex('FlowNodeInstances', ['correlationId', 'processModelId', 'state']);
    await queryInterface.addIndex('FlowNodeInstances', ['correlationId', 'state']);
    await queryInterface.addIndex('FlowNodeInstances', ['processModelId', 'state']);
    await queryInterface.addIndex('FlowNodeInstances', ['processInstanceId', 'flowNodeId']);
    await queryInterface.addIndex('FlowNodeInstances', ['processInstanceId', 'state']);

    await queryInterface.addIndex('ProcessTokens', ['flowNodeInstanceId']);
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
