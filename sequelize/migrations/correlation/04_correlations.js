'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes for version 4.0.0:
// - Added new state and error columns to the Correlation data model.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const correlationTableInfo = await queryInterface.describeTable('Correlations');

    const tableHasMatchingColumns =
      correlationTableInfo.state !== undefined
      && correlationTableInfo.error !== undefined;

    if (tableHasMatchingColumns) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    console.log('Adding state and error columns');

    await queryInterface.addColumn(
      'Correlations',
      'state',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'finished',
      }
    );

    await queryInterface.addColumn(
      'Correlations',
      'error',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );

    // Checks if the given table exists.
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch (error) {
        return false;
      }
    };

    const updateStateForId = async (id, updatedState) => {
      const updateStatement =
        `UPDATE "Correlations"
         SET "state" = '${updatedState}'
         WHERE "id" = ${id}`;

      try {
        await queryInterface.sequelize.query(updateStatement);
      } catch (error) {
        console.error('ERROR WHILE MIGRATING THE CORRELATIONS DATA MODEL');
        console.error('cause: ', error);
      }
    };

    const flowNodeInstancesTableExists = await tableExists('FlowNodeInstances');
    if (flowNodeInstancesTableExists) {
      console.log('Syncing new Correlation-states with FlowNodeInstance states');
      const obtainAllCorrelationsQuery = 'SELECT * FROM Correlations';
      const allCorrelations = (await queryInterface.sequelize.query(obtainAllCorrelationsQuery))[0];

      for (const currentCorrelationEntry of allCorrelations) {
        const currentProcessInstanceId = currentCorrelationEntry.processInstanceId;
        const queryActiveFlowNodes =
          `SELECT "state"
          FROM "FlowNodeInstances"
          WHERE "processInstanceId" = '${currentProcessInstanceId}' AND ("state" = 'running' OR state = 'suspended')`;

        const activeFlowNodeInstancesforProcessInstance = (await queryInterface.sequelize.query(queryActiveFlowNodes))[0];
        const processInstanceIsActive = activeFlowNodeInstancesforProcessInstance.length > 0;

        /**
         * A FlowNodeInstance whose current state is set to running will always
         * prioritized over those, with an error state.
         *
         *
         * If a ProcessInstance has FlowNodeInstances with both, "error" and "running|suspended" states,
         * the containing correlation will be in a "running" state.
         * This is because errors within a FlowNode do not necessarily cause the entire ProcessInstance to fail.
         */
        if (processInstanceIsActive) {
          await updateStateForId(currentCorrelationEntry.id, 'running');
          continue;
        }

        const queryErroneousFlowNodes =
        `SELECT "state"
        FROM "FlowNodeInstances"
        WHERE "processInstanceId" = '${currentProcessInstanceId}' AND ("state" = 'error' OR state = 'terminated')`;

        const erroneousFlowNodeInstancesforProcessInstance = (await queryInterface.sequelize.query(queryErroneousFlowNodes))[0];
        const processInstanceHasErrored = erroneousFlowNodeInstancesforProcessInstance.length > 0;

        if (processInstanceHasErrored) {
          await updateStateForId(currentCorrelationEntry.id, 'error');
        }
      }
    }

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
