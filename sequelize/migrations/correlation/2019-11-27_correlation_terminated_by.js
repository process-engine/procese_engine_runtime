'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes for version 9.2.0:
// - Added new optional terminatedBy and finishedAt columns to the Correlation data model.
module.exports = {
  up: async (queryInterface, Sequelize, dialect) => {

    console.log('Running updating migrations');
    console.log('Adding terminatedBy and finishedAt columns');

    const correlationTableInfo = await queryInterface.describeTable('Correlations');

    if (!correlationTableInfo.terminatedBy) {
      await queryInterface.addColumn(
        'Correlations',
        'terminatedBy',
        {
          type: Sequelize.STRING,
          allowNull: true,
        }
      );
    }

    if (!correlationTableInfo.finishedAt) {
      await queryInterface.addColumn(
        'Correlations',
        'finishedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        }
      );
    }

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
