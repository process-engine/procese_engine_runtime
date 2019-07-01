'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// - Adding indexes to ProcessDefinitions table for each commonly used query operation
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Adding indexes to ProcessDefinitions table for each commonly used query operation');

    // NOTE: MySql cannot use TEXT type columns as index.
    // https://stackoverflow.com/questions/1827063/mysql-error-key-specification-without-a-key-length
    // Using standard VARCHAR(255) - which is implied by the use of STRING - should suffice here,
    // since the hashes stored in that column have a length of 60.
    // So changing the type should be safe.
    await queryInterface.changeColumn(
      'ProcessDefinitions',
      'hash',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      }
    );

    await queryInterface.addIndex('ProcessDefinitions', ['name']);
    await queryInterface.addIndex('ProcessDefinitions', ['hash']);
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
