'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes for repository version 10.0.0:
// - Add new column interruptedBy
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    console.log('Adding new interruptedBy column.');

    await queryInterface.addColumn(
      'FlowNodeInstances',
      'interruptedBy',
      {
        type: Sequelize.STRING,
        allowNull: true,
      });

    console.log('Migration successful.');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
