'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 4.4.1 and 5.0.0:
// - The column flowNodeType was added to store an FNIs BPMN type (ScriptTask, UserTask, etc)
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const flowNodeInstanceTableInfo = await queryInterface.describeTable('FlowNodeInstances');

    const migrationNotRequired = flowNodeInstanceTableInfo.flowNodeType !== undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    console.log('Adding new flowNodeType column');
    await queryInterface.addColumn(
      'FlowNodeInstances',
      'flowNodeType',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
