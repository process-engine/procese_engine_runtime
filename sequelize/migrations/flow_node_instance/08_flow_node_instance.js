'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 7.0.0 and 8.0.0:
// - Moved the following columns from the ProcessTokenTable to the FlowNodeInstanceTable:
//    - processInstanceId
//    - processModelId
//    - correlationId
//    - identity
//    - callerId => was renamend to "parentProcessInstanceId"
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    console.log('Moving unique ID columns from ProcessTokens table to FlowNodeInstance table.');

    await queryInterface.addColumn(
      'FlowNodeInstances',
      'processInstanceId',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'processModelId',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'correlationId',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'identity',
      {
        type: Sequelize.STRING,
        allowNull: true,
      });
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'parentProcessInstanceId',
      {
        type: Sequelize.STRING,
        allowNull: true,
      });

    const updateFlowNodeInstancesquery = `UPDATE "FlowNodeInstances"
      SET
        "processInstanceId" = (
          SELECT "processInstanceId"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"),
        "processModelId" = (
          SELECT "processModelId"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"),
        "correlationId" = (
          SELECT "correlationId"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"),
        "identity" = (
          SELECT "identity"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"),
        "parentProcessInstanceId" = (
          SELECT "caller"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId");`;

    await queryInterface.sequelize.query(updateFlowNodeInstancesquery);

    await queryInterface.removeColumn('ProcessTokens', 'processInstanceId');
    await queryInterface.removeColumn('ProcessTokens', 'processModelId');
    await queryInterface.removeColumn('ProcessTokens', 'correlationId');
    await queryInterface.removeColumn('ProcessTokens', 'identity');
    await queryInterface.removeColumn('ProcessTokens', 'caller');

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
