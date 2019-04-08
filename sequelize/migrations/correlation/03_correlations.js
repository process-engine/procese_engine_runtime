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

    const environmentIsPostgres = process.env.NODE_ENV === 'postgres' || process.env.NODE_ENV === 'test-postgres';

    console.log('Changing PrimaryKey column ID to integer based column');

    await queryInterface.createTable('correlations_new', {
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

    const updateQuerySqlite = `INSERT INTO correlations_new
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
                                      updatedAt
                              FROM Correlations;`;

    const updateQueryPostgres = `INSERT INTO correlations_new
                                  ("correlationId",
                                  "processInstanceId",
                                  "parentProcessInstanceId",
                                  "processModelId",
                                  "identity",
                                  "processModelHash",
                                  "createdAt",
                                  "updatedAt")
                                  SELECT src."correlationId",
                                          src."processInstanceId",
                                          src."parentProcessInstanceId",
                                          src."processModelId",
                                          src."identity",
                                          src."processModelHash",
                                          src."createdAt",
                                          src."updatedAt"
                                  FROM public."Correlations" AS src;`;

    console.log('TRANSFERRING DATA TO TEMP TABLE');

    if (environmentIsPostgres) {
      await queryInterface.sequelize.query(updateQueryPostgres);
    } else {
      await queryInterface.sequelize.query(updateQuerySqlite);
    }

    console.log('DROP OLD TABLE');

    await queryInterface.dropTable('Correlations');

    console.log('RENAME TEMP TABLE');

    await queryInterface.renameTable('correlations_new', 'Correlations');

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
