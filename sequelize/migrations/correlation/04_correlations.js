'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 1.2.0 and 2.0.0:
// - Added new column: parentProcessInstanceId
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const correlationTableInfo = await queryInterface.describeTable('Correlations');

    const tableHasMatchingColumns =
      correlationTableInfo.state !== undefined
      && correlationTableInfo.error;

    if (tableHasMatchingColumns) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    console.log('Addings state and error columns');

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
        `UPDATE Correlations
         SET state = '${updatedState}'
         WHERE id = ${id}`;

      try {
        await queryInterface.sequelize.query(updateStatement);
      } catch (error) {
        console.log(error);
      }
    };

    const flowNodeInstancesTableExists = await tableExists('FlowNodeInstances');
    console.log(flowNodeInstancesTableExists);
    if (flowNodeInstancesTableExists) {
      const query = `SELECT * FROM Correlations`;
      const correlations = await queryInterface.sequelize.query(query);

      for (const currentCorrelationEntry of correlations[0]) {
        const currentInstanceId = currentCorrelationEntry.processInstanceId;
        const checkRunningInstancesStatement =
          `SELECT state
          FROM FlowNodeInstances
          WHERE processInstanceId = '${currentInstanceId}' AND (state = 'running' OR state = 'suspended')`;

        const correlationsWithRunningTasks = await queryInterface.sequelize.query(checkRunningInstancesStatement);

        const checkErroneousInstancesStatement =
        `SELECT state
        FROM FlowNodeInstances
        WHERE processInstanceId = '${currentInstanceId}' AND (state = 'error' OR state = 'terminated')`;

        const correlationsWithErroneousTasks = await queryInterface.sequelize.query(checkErroneousInstancesStatement);

        const correlationContainsRunningInstances = correlationsWithRunningTasks[0].length > 0;
        const correlationContainsErroneousTasks = correlationsWithErroneousTasks[0].length > 0;

        if (correlationContainsRunningInstances || correlationContainsErroneousTasks) {
          const stateToSet = (correlationContainsRunningInstances) ? 'running' : 'error';
          console.log('======================================================');
          console.log('State to set: ', stateToSet);
          console.log('======================================================');
          updateStateForId(currentCorrelationEntry.id, stateToSet);
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
