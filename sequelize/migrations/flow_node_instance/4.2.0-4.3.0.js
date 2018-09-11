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

    console.log(processTokenTableInfo);

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

    console.log('Add unique-constraint to FlowNodeInstances.flowNodeInstanceId');
    await queryInterface.changeColumn(
      'FlowNodeInstances',
      'flowNodeInstanceId',
      {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      }
    );

    console.log('Updating existing foreign key data');
    for (const processToken of processTokens) {
      const flowNodeInstanceIdQueryResult =
        await queryInterface.sequelize.query(`SELECT flowNodeInstanceId FROM FlowNodeInstances WHERE id = '${processToken.flowNodeInstanceForeignKey}'`);

      const flowNodeInstanceId = flowNodeInstanceIdQueryResult[0][0].flowNodeInstanceId;

      const updateProcessTokenQuery = `UPDATE ProcessTokens SET flowNodeInstanceId = '${flowNodeInstanceId}' WHERE id = '${processToken.id}'`;
      console.log('executing: ', updateProcessTokenQuery);
      await queryInterface.sequelize.query(updateProcessTokenQuery);
    }

    console.log('Adding new index');
    await queryInterface.addConstraint('ProcessTokens', ['flowNodeInstanceId'], {
      type: 'FOREIGN KEY',
      name: 'FK_process_token_flow_node_instance',
      references: {
        table: 'FlowNodeInstances',
        field: 'flowNodeInstanceId',
      },
      onDelete: 'cascade',
    });
    console.log('Migration successful!');
  },
  down: async (queryInterface, Sequelize) => {
    console.log('Running reverting migrations');
    return Promise.resolve();
  },
};

// OLD:
// CREATE TABLE `FlowNodeInstances` (
//   `id`	UUID,
//   `flowNodeInstanceId`	VARCHAR ( 255 ) NOT NULL,
//   `flowNodeId`	VARCHAR ( 255 ) NOT NULL,
//   `state`	INTEGER NOT NULL DEFAULT 0,
//   `error`	VARCHAR ( 255 ),
//   `isSuspended`	TINYINT ( 1 ) NOT NULL DEFAULT 0,
//   `createdAt`	DATETIME NOT NULL,
//   `updatedAt`	DATETIME NOT NULL,
//   PRIMARY KEY(`id`)
// );
// CREATE TABLE `ProcessTokens` (
//   `id`	UUID,
//   `processInstanceId`	VARCHAR ( 255 ) NOT NULL,
//   `processModelId`	VARCHAR ( 255 ) NOT NULL,
//   `flowNodeInstanceId`	UUID NOT NULL,
//   `correlationId`	VARCHAR ( 255 ) NOT NULL,
//   `identity`	TEXT NOT NULL,
//   `createdAt`	DATETIME DEFAULT '2018-08-31 13:14:58.517 +00:00',
//   `caller`	VARCHAR ( 255 ),
//   `payload`	TEXT,
//   `updatedAt`	DATETIME NOT NULL,
//   `flowNodeInstanceForeignKey`	UUID,
//   FOREIGN KEY(`flowNodeInstanceForeignKey`) REFERENCES `FlowNodeInstances`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
//   PRIMARY KEY(`id`)
// );

// NEW:
// CREATE TABLE `FlowNodeInstances` (
//   `id`	UUID,
//   `flowNodeInstanceId`	VARCHAR ( 255 ) NOT NULL UNIQUE,
//   `flowNodeId`	VARCHAR ( 255 ) NOT NULL,
//   `state`	VARCHAR ( 255 ) NOT NULL DEFAULT 0,
//   `error`	VARCHAR ( 255 ),
//   `isSuspended`	TINYINT ( 1 ) NOT NULL DEFAULT 0,
//   `createdAt`	DATETIME NOT NULL,
//   `updatedAt`	DATETIME NOT NULL,
//   PRIMARY KEY(`id`)
// );
//  CREATE TABLE `ProcessTokens` (
//    `id`	UUID,
//    `processInstanceId`	VARCHAR ( 255 ) NOT NULL,
//    `processModelId`	VARCHAR ( 255 ) NOT NULL,
//    `flowNodeInstanceId`	VARCHAR ( 255 ) NOT NULL,
//    `correlationId`	VARCHAR ( 255 ) NOT NULL,
//    `identity`	TEXT NOT NULL,
//    `createdAt`	DATETIME DEFAULT '2018-08-31 12:32:52.441 +00:00',
//    `caller`	VARCHAR ( 255 ),
//    `type`	VARCHAR ( 255 ),
//    `payload`	TEXT,
//    `updatedAt`	DATETIME NOT NULL,
//    FOREIGN KEY(`flowNodeInstanceId`) REFERENCES `FlowNodeInstances`(`flowNodeInstanceId`) ON DELETE CASCADE ON UPDATE CASCADE,
//    PRIMARY KEY(`id`)
//  );
