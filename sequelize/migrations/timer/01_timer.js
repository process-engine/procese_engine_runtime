'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 1.0.0 and 2.0.0:
// - Remove custom definition for primaryKey column "id"
// - Use a column based on what Sequelize auto-generates
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const timerTableInfo = await queryInterface.describeTable('Timers');

    const idHasMatchingType = timerTableInfo.id.type === 'INTEGER';

    if (idHasMatchingType) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    console.log('Changing PrimaryKey column ID to integer based column');

    queryInterface.createTable('Timers_New', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      timerId: {
        type: Sequelize.STRING,
        allowNull: true,
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

    const updateQuery = `INSERT INTO Timers_New
                          (timerId,
                           type,
                           expirationDate,
                           rule,
                           eventName,
                           lastElapsed,
                           createdAt,
                           updatedAt)
                          SELECT id,
                                 type,
                                 expirationDate,
                                 rule,
                                 eventName,
                                 lastElapsed,
                                 createdAt,
                                 updatedAt FROM Timers;`;

    await queryInterface.sequelize.query(updateQuery);

    queryInterface.dropTable('Timers');
    queryInterface.renameTable('Timers_New', 'Timers');

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
