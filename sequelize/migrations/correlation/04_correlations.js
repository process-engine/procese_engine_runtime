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
        console.error(' + '.repeat(20));
        console.error('ERROR WHILE MIGRATING THE CORRELATIONS DATA MODEL');
        console.error('cause: ', error);
        console.error(' + '.repeat(20));
      }
    };

    const flowNodeInstancesTableExists = await tableExists('FlowNodeInstances');
    console.log(flowNodeInstancesTableExists);
    if (flowNodeInstancesTableExists) {
      const obtainAllCorrelationsQuery = 'SELECT * FROM Correlations';
      const allCorrelations = await queryInterface.sequelize.query(obtainAllCorrelationsQuery);

      for (const currentCorrelationEntry of allCorrelations[0]) {
        const currentInstanceId = currentCorrelationEntry.processInstanceId;
        const checkRunningInstancesStatement =
          `SELECT state
          FROM FlowNodeInstances
          WHERE processInstanceId = '${currentInstanceId}' AND (state = 'running' OR state = 'suspended')`;

        const correlationsWithRunningTasks = (await queryInterface.sequelize.query(checkRunningInstancesStatement))[0];
        const correlationContainsRunningTask = correlationsWithRunningTasks.length > 0;

        /**
         * A FlowNodeInstance whose current state is set to running will always
         * prioritized over those, with an error state.
         *
         * If a Correlation is associated with two different FlowNodeInstances whose
         * states are running and error, the Correlation will get a definitive
         * state of running.
         */
        if (correlationContainsRunningTask) {
          await updateStateForId(currentCorrelationEntry.id, 'running');
          continue;
        }

        const checkErroneousInstancesStatement =
        `SELECT state
        FROM FlowNodeInstances
        WHERE processInstanceId = '${currentInstanceId}' AND (state = 'error' OR state = 'terminated')`;

        const correlationsWithErroneousTasks = (await queryInterface.sequelize.query(checkErroneousInstancesStatement))[0];
        const correlationContainsErroneousTasks = correlationsWithErroneousTasks.length > 0;

        if (correlationContainsErroneousTasks) {
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
