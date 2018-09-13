'use strict';

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions

// CHANGE NOTES:
// Changes between 4.2.0 and 4.3.0:
// - New Field: ProcessToken.type: Determines when the ProcessToken was recored (OnEnter/OnExit/OnSuspend/OnResume)
// - ForeignKey between ProcessToken and FlowNodeInstance ID was changed from FlowNodeInstance.PrimaryKey to FlowNodeInstance.flowNodeInstanceId
module.exports = {
  up: async (queryInterface, Sequelize) => {

    console.log('Running updating migrations');

    const processTokenTableInfo = await queryInterface.describeTable('ProcessTokens');

    const migrationNotRequired = processTokenTableInfo.flowNodeInstanceForeignKey === undefined
      && processTokenTableInfo.type !== undefined;

    if (migrationNotRequired) {
      console.log('The database is already up to date. Nothing to do here.');
      return;
    }

    // New Column for ProcessToken
    await queryInterface.addColumn(
      'ProcessTokens',
      'type',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );

    // Since this is a new column and the previous system only stored the onExit token,
    // we can safely set this to "onExit".
    //
    // NOTE:
    // Models are not available during migrations.
    // So if we want to manipulate data, raw queries are the only way.
    await queryInterface.sequelize.query('UPDATE ProcessTokens SET type = \'onExit\'');

    // Migrating the ForeignKey for ProcessToken / FlowNodeInstanceId.
    //
    // The property flowNodeInstanceId actually existed already, so we have to:

    // 1. Get all stored ProcessTokens
    const queryResult = await queryInterface.sequelize.query('SELECT id, flowNodeInstanceForeignKey FROM ProcessTokens');
    // The result looks something like this:
    // [ [ { id: 1,flowNodeInstanceForeignKey: 1 },
    //   { id: 2, flowNodeInstanceForeignKey: 2 } ],
    // Statement { sql: 'SELECT flowNodeInstanceForeignKey FROM ProcessTokens' } ]
    const processTokens = queryResult[0];

    console.log('Removing old index: flowNodeInstanceForeignKey');
    await queryInterface.removeIndex('ProcessTokens', 'flowNodeInstanceForeignKey');

    console.log('Removing old index column');
    await queryInterface.removeColumn('ProcessTokens', 'flowNodeInstanceForeignKey');

    console.log('Updating ProcessTokens.flowNodeInstanceId type to VARCHAR(255) to match the type of FlowNodeInstances.flowNodeInstanceId');
    await queryInterface.changeColumn(
      'ProcessTokens',
      'flowNodeInstanceId',
      {
        type: Sequelize.STRING,
        allowNull: false,
      }
    );

    // TODO: Due to a bug within sequelize, this doesn't work right now.
    //
    // This has the side effect of rendering foreign keys unusable,
    // because most DBs won't allow for non-unique columns to serve as foreign key.
    //
    // This goes for the changeColumn and addConstraint functions.
    console.log('Add unique-constraint to FlowNodeInstances.flowNodeInstanceId');
    queryInterface.addConstraint('FlowNodeInstances', ['flowNodeInstanceId'], {
      type: 'unique',
      name: 'flowNodeInstanceIdUniqueConstraint',
    });

    console.log('Updating existing foreign key data');
    for (const processToken of processTokens) {

      const selectFniIdQuery = `SELECT flowNodeInstanceId FROM FlowNodeInstances WHERE id = '${processToken.flowNodeInstanceForeignKey}'`;

      const flowNodeInstanceIdQueryResult = await queryInterface.sequelize.query(selectFniIdQuery);

      const flowNodeInstanceId = flowNodeInstanceIdQueryResult[0][0].flowNodeInstanceId;

      const updateProcessTokenQuery = `UPDATE ProcessTokens SET flowNodeInstanceId = '${flowNodeInstanceId}' WHERE id = '${processToken.id}'`;
      console.log('executing: ', updateProcessTokenQuery);
      await queryInterface.sequelize.query(updateProcessTokenQuery);
    }

    // TODO: See above, this is currently broken, due to a bug with sequelize.
    // console.log('Adding new index');
    // await queryInterface.addConstraint('ProcessTokens', ['flowNodeInstanceId'], {
    //   type: 'FOREIGN KEY',
    //   name: 'FK_process_token_flow_node_instance',
    //   references: {
    //     table: 'FlowNodeInstances',
    //     field: 'flowNodeInstanceId',
    //   },
    //   onDelete: 'cascade',
    // });
    console.log('Migration successful!');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};
