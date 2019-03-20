/**
 * Through a misconfiguration error, we ended up with a `ProcessDefinitions` table in the `flow_node_instance.sqlite` database
 * and `FlowNodeInstances` and `ProcessTokens` tables in the `process_model.sqlite` database.
 *
 * After applying Hotfix v7.1.1, any correlation that makes use of this misplaced data will cause an error when queried.
 *
 * This script will move all data to their correct place, in order to repair the correlations.
 *
 * If you do not store your SQLite databases in the default directory,
 * then `process.env.SQLITE_STORAGE_PATH` must contain the path to your SQLite storage files!
 *
 * NOTE:
 * This issue only affected those setups that use separate SQLite databases for each data table.
 * Those users that store all their tables in one place are safe and do not need to run this.
 */
'use strict';

const SequelizeConnectionManager = require('@essential-projects/sequelize_connection_manager').SequelizeConnectionManager;

const environment = require('./setup/environment_handler');

const connectionManager = new SequelizeConnectionManager();

async function run() {

  environment.initialize();

  const pathToFlowNodeInstanceDb = process.env.process_engine__flow_node_instance_repository__storage;
  const pathToProcessModelDb = process.env.process_engine__process_model_repository__storage;

  // If all data is stored in the same database, then everything is fine.
  // This issue only affected those setups that store FlowNodeInstances and ProcessDefinitions at different locations.
  const dbPathsMatch = pathToProcessModelDb === pathToFlowNodeInstanceDb;
  if (dbPathsMatch) {
    return;
  }

  const flowNodeInstanceDbQueryInterface = await createConnection('flow_node_instance_repository.json', pathToFlowNodeInstanceDb);
  const processModelDbQueryInterface = await createConnection('process_model_repository.json', pathToProcessModelDb);

  const flowNodeInstanceDbHasProcessModels = await checkIfFixForTableIsNeeded(flowNodeInstanceDbQueryInterface, 'ProcessDefinitions');
  const processModelDbHasFlowNodeInstances = await checkIfFixForTableIsNeeded(processModelDbQueryInterface, 'FlowNodeInstances');

  if (flowNodeInstanceDbHasProcessModels) {
    console.log('Moving ProcessModels from FlowNodeInstance DB to ProcessModel DB...');
    await moveProcessModelsFromFlowNodeInstanceDbToProcessModelDb(flowNodeInstanceDbQueryInterface, processModelDbQueryInterface);
  } else {
    await flowNodeInstanceDbQueryInterface.dropTable('ProcessDefinitions');
  }

  if (processModelDbHasFlowNodeInstances) {
    console.log('Moving FlowNodeInstances and ProcessTokens from ProcessModel DB to FlowNodeInstance DB...');
    await moveFlowNodeInstancesFromProcessModelDbToFlowNodeInstanceDb(flowNodeInstanceDbQueryInterface, processModelDbQueryInterface);
  } else {
    await processModelDbQueryInterface.dropTable('FlowNodeInstances');
    await processModelDbQueryInterface.dropTable('ProcessTokens');
  }
}

async function createConnection(repository, sqliteStoragePath) {

  const config = environment.readConfigFile('sqlite', repository);

  config.storage = sqliteStoragePath;

  const sequelizeInstance = await connectionManager.getConnection(config);
  const queryInterface = sequelizeInstance.getQueryInterface();

  return queryInterface;
}

async function checkIfFixForTableIsNeeded(queryInterface, tableName) {

  try {
    // The only way to check if a table exists is to run the call to "describeTable"
    // and see if it runs into an error.
    await queryInterface.describeTable(tableName);

    // If the table exists, check if it contains anything.
    // If not, then there is no need to do anything.
    const tableData = (await queryInterface.sequelize.query(`SELECT * FROM ${tableName}`))[0];

    return tableData.length > 0;
  } catch (error) {
    return false;
  }
}

async function moveProcessModelsFromFlowNodeInstanceDbToProcessModelDb(flowNodeInstanceDbQueryInterface, processModelDbQueryInterface) {

  const processModelsToMove = (await flowNodeInstanceDbQueryInterface.sequelize.query('SELECT * FROM ProcessDefinitions'))[0];

  for (const processModel of processModelsToMove) {

    // eslint-disable-next-line
    const escapedXml = escape(processModel.xml);

    const updateQuery = `INSERT INTO ProcessDefinitions
                          (name, xml, hash, createdAt, updatedAt)
                          VALUES ('${processModel.name}',
                                 '${escapedXml}',
                                 '${processModel.hash}',
                                 '${processModel.createdAt}',
                                 '${processModel.updatedAt}');`;

    await processModelDbQueryInterface.sequelize.query(updateQuery);
  }

  await flowNodeInstanceDbQueryInterface.dropTable('ProcessDefinitions');
}

async function moveFlowNodeInstancesFromProcessModelDbToFlowNodeInstanceDb(flowNodeInstanceDbQueryInterface, processModelDbQueryInterface) {

  const flowNodeInstancesToMove = (await processModelDbQueryInterface.sequelize.query('SELECT * FROM FlowNodeInstances'))[0];
  const processTokensToMove = (await processModelDbQueryInterface.sequelize.query('SELECT * FROM ProcessTokens'))[0];

  for (const flowNodeInstance of flowNodeInstancesToMove) {

    const updateQuery = `INSERT INTO FlowNodeInstances
                          (flowNodeInstanceId, flowNodeId, flowNodeType, eventType, correlationId, processModelId,
                            processInstanceId, parentProcessInstanceId, identity, state, error, previousFlowNodeInstanceId,
                            createdAt, updatedAt)
                          VALUES ('${flowNodeInstance.flowNodeInstanceId}', '${flowNodeInstance.flowNodeId}', '${flowNodeInstance.flowNodeType}',
                                  '${flowNodeInstance.eventType}', '${flowNodeInstance.correlationId}', '${flowNodeInstance.processModelId}',
                          '${flowNodeInstance.processInstanceId}', '${flowNodeInstance.parentProcessInstanceId}',
                          '${flowNodeInstance.identity}', '${flowNodeInstance.state}', '${flowNodeInstance.error}',
                          '${flowNodeInstance.previousFlowNodeInstanceId}', '${flowNodeInstance.createdAt}', '${flowNodeInstance.updatedAt}');`;

    await flowNodeInstanceDbQueryInterface.sequelize.query(updateQuery);
  }

  for (const processToken of processTokensToMove) {

    const updateQuery = `INSERT INTO ProcessTokens
                          (type, payload, flowNodeInstanceId, createdAt, updatedAt)
                          VALUES ('${processToken.type}', '${processToken.payload}', '${processToken.flowNodeInstanceId}',
                          '${processToken.createdAt}', '${processToken.updatedAt}');`;

    await flowNodeInstanceDbQueryInterface.sequelize.query(updateQuery);
  }

  await processModelDbQueryInterface.dropTable('FlowNodeInstances');
  await processModelDbQueryInterface.dropTable('ProcessTokens');
}

run()
  .then(() => {
    console.log('Success!');
  })
  .catch((error) => {
    console.log('Failed to execute post-migration script: ', error);
  });
