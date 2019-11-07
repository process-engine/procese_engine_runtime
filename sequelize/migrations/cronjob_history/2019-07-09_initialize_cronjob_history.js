'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, dialect) => {

    const checkIfTableExists = async () => {
      // Note
      // Unfortunately, at migration level, there is no such thing as "checkIfTableExits".
      // We can only query for the table and see if that query causes an exception.
      try {

        const result = await queryInterface.describeTable('CronjobHistory');
        return result;
      } catch (error) {
        return undefined;
      }
    };

    const cronjobHistoryTableInfo = await checkIfTableExists();

    if (cronjobHistoryTableInfo) {
      console.log('CronjobHistory already exist. Skipping initial migration.');
      return Promise.resolve();
    }

    console.log('Creating CronjobHistory table');

    return queryInterface.createTable('CronjobHistory', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      processModelId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      startEventId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      crontab: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      executedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
    });

  },
  down: async (queryInterface, Sequelize) => {

    return queryInterface.dropTable('CronjobHistory');

  },
};
