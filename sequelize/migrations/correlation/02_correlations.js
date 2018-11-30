'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 1.2.0 and 2.0.0:
// - Added new column: parentProcessInstanceId
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const correlationTableInfo = await queryInterface.describeTable('Correlations');

    const tableHasMatchingColumn = correlationTableInfo.parentProcessInstanceId !== undefined;

    if (tableHasMatchingColumn) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    await queryInterface.addColumn(
      'Correlations',
      'parentProcessInstanceId',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
