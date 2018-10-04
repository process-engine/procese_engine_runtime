'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    const checkIfTableExists = async () => {
      // Note
      // Unfortunately, at migration level, is no such thing as "checkIfTableExits".
      // We can only query for the table and see if that query causes an exception.
      try {

        const result = await queryInterface.describeTable('Correlations');
        return result;
      } catch (error) {
        return undefined;
      }
    };

    const correlationsTableInfo = await checkIfTableExists();

    if (correlationsTableInfo) {
      console.log('Correlations already exist. Skipping initial migration.');
      return Promise.resolve();
    }

    console.log('Creating Correlations table');

    return queryInterface.createTable('Correlations', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      correlationId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      processInstanceId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      processModelId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      processModelHash: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      identity: {
        type: Sequelize.TEXT,
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

  },
  down: async (queryInterface, Sequelize) => {

    return queryInterface.dropTable('Correlations');

  },
};
