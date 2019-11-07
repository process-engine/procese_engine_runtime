'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, dialect) => {

    const checkIfTableExists = async (tableName) => {
      try {
        const result = await queryInterface.describeTable(tableName);
        return result;
      } catch (error) {
        return undefined;
      }
    };

    const flowNodeInstanceTableInfo = await checkIfTableExists('FlowNodeInstances');
    const processTokenTableInfo = await checkIfTableExists('ProcessTokens');

    if (!flowNodeInstanceTableInfo) {
      console.log('Creating FlowNodeInstances table');
      await queryInterface.createTable('FlowNodeInstances', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
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
        state: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'finished',
        },
        error: {
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
    }

    if (!processTokenTableInfo) {
      console.log('Creating ProcessTokens table');
      await queryInterface.createTable('ProcessTokens', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        processInstanceId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        processModelId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        flowNodeInstanceId: {
          type: Sequelize.UUID,
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
          defaultValue: 'onExit',
        },
        payload: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        flowNodeInstanceForeignKey: {
          type: Sequelize.TEXT,
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
    }
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ProcessTokens');
    return queryInterface.dropTable('FlowNodeInstances');
  },
};
