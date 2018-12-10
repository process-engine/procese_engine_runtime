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

    console.log('Changing PrimaryKey column ID to integer based column');

    queryInterface.createTable('ExternalTasks_New', {
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
        allowNull: false,
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

    const updateQuery = `INSERT INTO ExternalTasks_New
                           (externalTaskId, workerId, topic, flowNodeInstanceId, correlationId, processModelId,
                            processInstanceId, lockExpirationTime, identity, payload, state, finishedAt,
                            result, error, version, createdAt, updatedAt)
                          SELECT id, workerId, topic, flowNodeInstanceId, correlationId, processModelId,
                            processInstanceId, lockExpirationTime, identity, payload, state, finishedAt,
                            result, error, version, createdAt, updatedAt
                          FROM ExternalTasks;`;

    await queryInterface.sequelize.query(updateQuery);

    queryInterface.dropTable('ExternalTasks');
    queryInterface.renameTable('ExternalTasks_New', 'ExternalTasks');

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
