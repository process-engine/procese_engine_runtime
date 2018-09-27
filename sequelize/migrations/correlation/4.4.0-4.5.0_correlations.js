'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 4.4.0 and 4.5.0:
// - Added new columns: processModelId and processInstanceId
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const processTokenTableInfo = await queryInterface.describeTable('Correlations');

    const migrationNotRequired = processTokenTableInfo.processModelId !== undefined
      && processTokenTableInfo.processInstanceId !== undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    await queryInterface.addColumn(
      'Correlations',
      'processModelId',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );

    await queryInterface.addColumn(
      'Correlations',
      'processInstanceId',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );

    await queryInterface.addColumn(
      'Correlations',
      'identity',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );

    // Checks if the given table exists.
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable('ProcessDefinitions');
        return true;
      } catch (error) {
        return false;
      }
    };

    // NOTE:
    // We will not be able to update any data, if "ProcessDefinitions" is located
    // in a different database, or on a different server!
    const databaseHasProcessDefinitionsTable = await tableExists('ProcessDefinitions');
    if (databaseHasProcessDefinitionsTable) {

      const setProcessModelIdQuery = `UPDATE "Correlations"
                                        SET "processModelId" = (
                                            SELECT "name"
                                            FROM "ProcessDefinitions"
                                            WHERE "ProcessDefinitions"."hash" = "Correlations"."processModelHash"
                                            LIMIT 1);`;

      await queryInterface.sequelize.query(setProcessModelIdQuery);
    }

    // NOTE:
    // We will not be able to update any data, if "ProcessTokens" is located
    // in a different database, or on a different server!
    const databaseHasProcessTokensTable = await tableExists('ProcessTokens');
    if (databaseHasProcessTokensTable) {
      const setProcessInstanceId = `UPDATE "Correlations"
                                        SET "processInstanceId" = (
                                            SELECT "processInstanceId"
                                            FROM "ProcessTokens"
                                            WHERE "ProcessTokens"."correlationId" = "Correlations"."correlationId"
                                            LIMIT 1);`;

      await queryInterface.sequelize.query(setProcessInstanceId);

      const setIdentityQuery = `UPDATE "Correlations"
                                  SET "identity" = (
                                      SELECT "identity"
                                      FROM "ProcessTokens"
                                      WHERE "ProcessTokens"."correlationId" = "Correlations"."correlationId"
                                        AND "ProcessTokens"."processInstanceId" = "Correlations"."processInstanceId"
                                      LIMIT 1);`;

      await queryInterface.sequelize.query(setIdentityQuery);
    }

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
