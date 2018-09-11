'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    const checkIfTableExists = async () => {
      try {
        const result = await queryInterface.describeTable('Timers');
        return result;
      } catch (error) {
        return undefined;
      }
    }

    const timersTableInfo = await checkIfTableExists();

    if (timersTableInfo) {
      console.log('Timers already exist. Skipping initial migration.');
      return Promise.resolve();
    }

    console.log('Creating Timers table');

    return queryInterface.createTable('Timers', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      type: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rule: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      eventName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lastElapsed: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

  },
  down: async (queryInterface, Sequelize) => {

    return queryInterface.dropTable('Timers');

  }
}
