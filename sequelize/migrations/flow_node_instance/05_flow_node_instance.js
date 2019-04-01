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

    const environmentIsPostgres = process.env.NODE_ENV === 'postgres';

    if (flowNodeInstanceIdHasMatchingType && processTokenIdHasMatchingType) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    if (!processTokenIdHasMatchingType) {
      console.log('Changing PrimaryKey column ID of ProcessToken table to integer based column');

      await queryInterface.createTable('processtokens_new', {
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

      const updateQuerySqlite = `INSERT INTO processtokens_new
                                    (processInstanceId, processModelId, correlationId, identity, caller,
                                    type, payload, flowNodeInstanceId, createdAt, updatedAt)
                                  SELECT processInstanceId, processModelId, correlationId, identity, caller,
                                      type, payload, flowNodeInstanceId, createdAt, updatedAt
                                  FROM ProcessTokens;`;

      const updateQueryPostgres = `INSERT INTO processtokens_new
                                    ("processInstanceId", "processModelId", "correlationId", "identity", "caller",
                                    "type", "payload", "flowNodeInstanceId", "createdAt", "updatedAt")
                                  SELECT src."processInstanceId", src."processModelId", src."correlationId", src."identity", src."caller",
                                         src."type", src."payload", src."flowNodeInstanceId", src."createdAt", src."updatedAt"
                                  FROM public."ProcessTokens" AS src;`;

      if (environmentIsPostgres) {
        await queryInterface.sequelize.query(updateQueryPostgres);
      } else {
        await queryInterface.sequelize.query(updateQuerySqlite);
      }

      await queryInterface.dropTable('ProcessTokens');
      await queryInterface.renameTable('processtokens_new', 'ProcessTokens');
    }

    if (!flowNodeInstanceIdHasMatchingType) {
      console.log('Changing PrimaryKey column ID of FlowNodeInstance table to integer based column');

      await queryInterface.createTable('FlowNodeInstances_New', {
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

      const updateQuerySqlite =
        `INSERT INTO FlowNodeInstances_New
            (flowNodeInstanceId, flowNodeId, flowNodeType, state, error, eventType, previousFlowNodeInstanceId, createdAt, updatedAt)
          SELECT
            flowNodeInstanceId, flowNodeId, flowNodeType, state, error, eventType, previousFlowNodeInstanceId, createdAt, updatedAt
          FROM FlowNodeInstances;`;

      const updateQueryPostgres =
        `INSERT INTO "FlowNodeInstances_New"
            ("flowNodeInstanceId", "flowNodeId", "flowNodeType", "state", "error",
            "eventType", "previousFlowNodeInstanceId", "createdAt", "updatedAt")
          SELECT
            src."flowNodeInstanceId", src."flowNodeId", src."flowNodeType", src."state", src."error",
            src."eventType", src."previousFlowNodeInstanceId", src."createdAt", src."updatedAt"
          FROM public."FlowNodeInstances" AS src;`;

      if (environmentIsPostgres) {
        await queryInterface.sequelize.query(updateQueryPostgres);
      } else {
        await queryInterface.sequelize.query(updateQuerySqlite);
      }

      await queryInterface.dropTable('FlowNodeInstances');
      await queryInterface.renameTable('FlowNodeInstances_New', 'FlowNodeInstances');
    }

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
