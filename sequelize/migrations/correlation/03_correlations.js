'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 2.0.0 and 3.0.0:
// - Remove custom definition for primaryKey column "id"
// - Use a column based on what Sequelize auto-generates
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const correlationTableInfo = await queryInterface.describeTable('Correlations');

    const idHasMatchingType = correlationTableInfo.id.type === 'INTEGER';

    if (idHasMatchingType) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    console.log('Changing PrimaryKey column ID to integer based column');

    queryInterface.createTable('Correlations_New', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      correlationId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      processInstanceId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      parentProcessInstanceId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      processModelId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      identity: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      processModelHash: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      error: {
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

    const updateQuery = `INSERT INTO Correlations_New
                          (correlationId,
                           processInstanceId,
                           parentProcessInstanceId,
                           processModelId,
                           identity,
                           processModelHash,
                           createdAt,
                           updatedAt)
                          SELECT correlationId,
                                  processInstanceId,
                                  parentProcessInstanceId,
                                  processModelId,
                                  identity,
                                  processModelHash,
                                  createdAt,
                                  updatedAt FROM Correlations;`;

    await queryInterface.sequelize.query(updateQuery);

    queryInterface.dropTable('Correlations');
    queryInterface.renameTable('Correlations_New', 'Correlations');

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
