'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 6.0.0 and 7.0.0:
// - Remove custom definition for primaryKey column "id" for ProcessTokens and FlowNodeInstances
// - Use a column based on what Sequelize auto-generates for both tables
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const flowNodeInstanceTableInfo = await queryInterface.describeTable('FlowNodeInstances');
    const processTokenTableInfo = await queryInterface.describeTable('ProcessTokens');

    const flowNodeInstanceIdHasMatchingType = flowNodeInstanceTableInfo.id.type === 'INTEGER';
    const processTokenIdHasMatchingType = processTokenTableInfo.id.type === 'INTEGER';

    if (flowNodeInstanceIdHasMatchingType && processTokenIdHasMatchingType) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    if (!processTokenIdHasMatchingType) {
      console.log('Changing PrimaryKey column ID of ProcessToken table to integer based column');

      queryInterface.createTable('ProcessTokens_New', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        processInstanceId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        processModelId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        correlationId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        identity: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        caller: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        type: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        payload: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        flowNodeInstanceId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: new Date(),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: new Date(),
        },
      });

      const updateQuery = `INSERT INTO ProcessTokens_New
                              (processInstanceId, processModelId, correlationId, identity, caller,
                              type, payload, flowNodeInstanceId, createdAt, updatedAt)
                            SELECT processInstanceId, processModelId, correlationId, identity, caller,
                                type, payload, flowNodeInstanceId, createdAt, updatedAt
                            FROM ProcessTokens;`;

      await queryInterface.sequelize.query(updateQuery);

      queryInterface.dropTable('ProcessTokens');
      queryInterface.renameTable('ProcessTokens_New', 'ProcessTokens');
    }

    if (!flowNodeInstanceIdHasMatchingType) {
      console.log('Changing PrimaryKey column ID of FlowNodeInstance table to integer based column');

      queryInterface.createTable('FlowNodeInstances_New', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        flowNodeInstanceId: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        flowNodeId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        flowNodeType: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        state: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 0,
        },
        error: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        eventType: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        previousFlowNodeInstanceId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: new Date(),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: new Date(),
        },
      });

      const updateQuery = `INSERT INTO FlowNodeInstances_New
                               (flowNodeInstanceId, flowNodeId, flowNodeType, state, error, eventType, previousFlowNodeInstanceId, createdAt, updatedAt)
                             SELECT
                               flowNodeInstanceId, flowNodeId, flowNodeType, state, error, eventType, previousFlowNodeInstanceId, createdAt, updatedAt
                             FROM FlowNodeInstances;`;

      await queryInterface.sequelize.query(updateQuery);

      queryInterface.dropTable('FlowNodeInstances');
      queryInterface.renameTable('FlowNodeInstances_New', 'FlowNodeInstances');
    }

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
