'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 3.4.0 and 4.0.0:
// - Remove custom definition for primaryKey column "id"
// - Use a column based on what Sequelize auto-generates
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const processDefTableInfo = await queryInterface.describeTable('ProcessDefinitions');

    const idHasMatchingType = processDefTableInfo.id.type === 'INTEGER';

    if (idHasMatchingType) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    console.log('Changing PrimaryKey column ID to integer based column');

    await queryInterface.createTable('ProcessDefinitions_New', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      xml: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      hash: {
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

    const updateQuerySqlite =
      `INSERT INTO ProcessDefinitions_New
          (name, xml, hash, createdAt, updatedAt)
        SELECT
          name, xml, hash, createdAt, updatedAt
        FROM ProcessDefinitions;`;

    const updateQueryPostgres =
      `INSERT INTO "ProcessDefinitions_New"
          ("name", "xml", "hash", "createdAt", "updatedAt")
        SELECT
        src."name", src."xml", src."hash", src."createdAt", src."updatedAt"
        FROM public."ProcessDefinitions" AS src;`;

    if (process.env.NODE_ENV === 'postgres') {
      await queryInterface.sequelize.query(updateQueryPostgres);
    } else {
      await queryInterface.sequelize.query(updateQuerySqlite);
    }

    await queryInterface.dropTable('ProcessDefinitions');
    await queryInterface.renameTable('ProcessDefinitions_New', 'ProcessDefinitions');

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
