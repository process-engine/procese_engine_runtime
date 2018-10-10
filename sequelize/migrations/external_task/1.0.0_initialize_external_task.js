'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    const checkIfTableExists = async () => {
      // Note
      // Unfortunately, at migration level, is no such thing as "checkIfTableExits".
      // We can only query for the table and see if that query causes an exception.
      try {

        const result = await queryInterface.describeTable('ExternalTasks');
        return result;
      } catch (error) {
        return undefined;
      }
    };

    const externalTasksTableInfo = await checkIfTableExists();

    if (externalTasksTableInfo) {
      console.log('ExternalTasks already exist. Skipping initial migration.');
      return Promise.resolve();
    }

    console.log('Creating ExternalTasks table');

    return queryInterface.createTable('ExternalTasks', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
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
      processInstanceId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lockExpirationTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      payload: {
        type: Sequelize.STRING,
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

  },
  down: async (queryInterface, Sequelize) => {

    return queryInterface.dropTable('ExternalTasks');

  },
};
