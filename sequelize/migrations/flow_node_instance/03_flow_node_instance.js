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
  up: async (queryInterface, Sequelize, dialect) => {

    console.log('Running updating migrations');

    const environmentIsPostgres = dialect === 'postgres' || dialect === 'test-postgres';

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
        type: Sequelize.TEXT,
        allowNull: true,
      });
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'parentProcessInstanceId',
      {
        type: Sequelize.STRING,
        allowNull: true,
      });

    const updateFlowNodeInstancesQueryPostgres = `UPDATE "FlowNodeInstances"
      SET
        "processInstanceId" = (
          SELECT "processInstanceId"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"
          LIMIT 1),
        "processModelId" = (
          SELECT "processModelId"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"
          LIMIT 1),
        "correlationId" = (
          SELECT "correlationId"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"
          LIMIT 1),
        "identity" = (
          SELECT "identity"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"
          LIMIT 1),
        "parentProcessInstanceId" = (
          SELECT "caller"
          FROM "ProcessTokens"
          WHERE "FlowNodeInstances"."flowNodeInstanceId" = "ProcessTokens"."flowNodeInstanceId"
          LIMIT 1);`;

    const updateFlowNodeInstancesQueryDefault = updateFlowNodeInstancesQueryPostgres.replace(/"/gi, '');

    if (environmentIsPostgres) {
      await queryInterface.sequelize.query(updateFlowNodeInstancesQueryPostgres);
    } else {
      await queryInterface.sequelize.query(updateFlowNodeInstancesQueryDefault);
    }

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
