'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    const checkIfTableExists = async () => {
      try {
        const result = await queryInterface.describeTable('ProcessDefinitions');
        return result;
      } catch (error) {
        return undefined;
      }
    };

    const processDefinitionTableInfo = await checkIfTableExists();

    if (processDefinitionTableInfo) {
      console.log('ProcessDefinitions already exist. Skipping initial migration.');
      return Promise.resolve();
    }

    console.log('Creating ProcessDefinitions table');

    return queryInterface.createTable('ProcessDefinitions', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      xml: {
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

  },
  down: async (queryInterface, Sequelize) => {

    return queryInterface.dropTable('ProcessDefinitions');

  },
};
