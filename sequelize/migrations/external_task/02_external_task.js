'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 2.10.0 and 2.11.0:
// - Remove custom definition for primaryKey column "id"
// - Use a column based on what Sequelize auto-generates
// - Add column externalTaskId to store the UUID based ids.
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const externalTaskTableInfo = await queryInterface.describeTable('ExternalTasks');

    const idHasMatchingType = externalTaskTableInfo.id.type === 'INTEGER';

    if (idHasMatchingType) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }
    try {
      // Drop the table if it exists.
      // This can happen, if a previous migration attempt failed.
      queryInterface.dropTable('external_tasks_new');
    } catch (error) {
      // Do nothing
    }

    const environmentIsPostgres = process.env.NODE_ENV === 'postgres' || process.env.NODE_ENV === 'test-postgres';

    console.log('Changing PrimaryKey column ID to integer based column');

    await queryInterface.createTable('external_tasks_new', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      externalTaskId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      workerId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      topic: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      flowNodeInstanceId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      correlationId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      processModelId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      processInstanceId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lockExpirationTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      identity: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      payload: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      finishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      result: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // NOTE:
    // Can't use single query with Subselect here, because the SQLite adapter will crash halfway when dealing with larger databases.

    // The only way to get around this, is to copy&pase all entries single file.
    const selectQuery = environmentIsPostgres
      ? 'SELECT * FROM public."ExternalTasks"'
      : 'SELECT * FROM ExternalTasks';

    const externalTaskData = (await queryInterface.sequelize.query(selectQuery))[0];
    for (const task of externalTaskData) {

      const updateQuerySqlite = `INSERT INTO external_tasks_new
                             (externalTaskId, workerId, topic, flowNodeInstanceId, correlationId, processModelId,
                              processInstanceId, lockExpirationTime, identity, payload, state, finishedAt,
                              result, error, version, createdAt, updatedAt)
                            VALUES ('${task.id}', '${task.workerId}', '${task.topic}', '${task.flowNodeInstanceId}',
                              '${task.correlationId}', '${task.processModelId}', '${task.processInstanceId}', '${task.lockExpirationTime}',
                              '${task.identity}', '${task.payload}', '${task.state}', '${task.finishedAt}', '${task.result}', '${task.error}',
                              '${task.version}', '${task.createdAt}', '${task.updatedAt}');`;

      const updateQueryPostgres = `INSERT INTO external_tasks_new
                             ("externalTaskId", "workerId", "topic", "flowNodeInstanceId", "correlationId", "processModelId",
                              "processInstanceId", "lockExpirationTime", "identity", "payload", "state", "finishedAt",
                              "result", "error", "version", "createdAt", "updatedAt")
                            VALUES ('${task.id}', '${task.workerId}', '${task.topic}', '${task.flowNodeInstanceId}',
                              '${task.correlationId}', '${task.processModelId}', '${task.processInstanceId}', '${task.lockExpirationTime}',
                              '${task.identity}', '${task.payload}', '${task.state}', '${task.finishedAt}', '${task.result}', '${task.error}',
                              '${task.version}', '${task.createdAt}', '${task.updatedAt}');`;

      if (environmentIsPostgres) {
        await queryInterface.sequelize.query(updateQueryPostgres);
      } else {
        await queryInterface.sequelize.query(updateQuerySqlite);
      }
    }

    await queryInterface.dropTable('ExternalTasks');
    await queryInterface.renameTable('external_tasks_new', 'ExternalTasks');

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
