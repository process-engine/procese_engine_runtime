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
import {Logger} from 'loggerhythm';
import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

import * as environment from '../modules/environment';

const scriptName = '7.1.1-fix_sqlite_database_contents';

const nodeEnv = process.env.NODE_ENV || 'sqlite';
const nodeEnvIsPostgres = nodeEnv === 'postgres' || nodeEnv === 'test-postgres';

const logger = Logger.createLogger('processengine:runtime:post_migration_7.1.1');

const connectionManager = new SequelizeConnectionManager();

export async function runPostMigrationForV711(): Promise<void> {

  const pathToFlowNodeInstanceDb = process.env.process_engine__flow_node_instance_repository__storage;
  const pathToProcessModelDb = process.env.process_engine__process_model_repository__storage;

  const flowNodeInstanceDbQueryInterface = await createConnection('flow_node_instance_repository.json', pathToFlowNodeInstanceDb);
  const processModelDbQueryInterface = await createConnection('process_model_repository.json', pathToProcessModelDb);

  const migrationWasRun = await checkIfMigrationWasRun(processModelDbQueryInterface);
  if (migrationWasRun) {
    return;
  }

  logger.info('Running Post Migration...');

  // If all data is stored in the same database, then everything is fine.
  // This issue only affected those setups that store FlowNodeInstances and ProcessDefinitions at different locations.
  const dbPathsMatch = pathToProcessModelDb === pathToFlowNodeInstanceDb;
  if (dbPathsMatch) {
    logger.info('All tables are stored in the same database. Nothing to do here.');
    await markMigrationAsRun(processModelDbQueryInterface);
    return;
  }

  const flowNodeInstanceDbHasProcessModels = await checkIfFixForTableIsNeeded(flowNodeInstanceDbQueryInterface, 'ProcessDefinitions');
  const processModelDbHasFlowNodeInstances = await checkIfFixForTableIsNeeded(processModelDbQueryInterface, 'FlowNodeInstances');

  if (flowNodeInstanceDbHasProcessModels) {
    logger.info('Moving ProcessModels from FlowNodeInstance DB to ProcessModel DB...');
    await moveProcessModelsFromFlowNodeInstanceDbToProcessModelDb(flowNodeInstanceDbQueryInterface, processModelDbQueryInterface);
  } else {
    await flowNodeInstanceDbQueryInterface.dropTable('ProcessDefinitions');
  }

  if (processModelDbHasFlowNodeInstances) {
    logger.info('Moving FlowNodeInstances and ProcessTokens from ProcessModel DB to FlowNodeInstance DB...');
    await moveFlowNodeInstancesFromProcessModelDbToFlowNodeInstanceDb(flowNodeInstanceDbQueryInterface, processModelDbQueryInterface);
  } else {
    await processModelDbQueryInterface.dropTable('FlowNodeInstances');
    await processModelDbQueryInterface.dropTable('ProcessTokens');
  }

  await markMigrationAsRun(processModelDbQueryInterface);

  logger.info('Done.');
}

async function createConnection(repository, sqliteStoragePath): Promise<any> {

  const config = environment.readConfigFile(nodeEnv, repository);

  config.storage = sqliteStoragePath;

  const sequelizeInstance = await connectionManager.getConnection(config);
  const queryInterface = sequelizeInstance.getQueryInterface();

  return queryInterface;
}

async function checkIfMigrationWasRun(processModelDbQueryInterface): Promise<boolean> {

  const querySqlite = `SELECT * FROM "SequelizeMeta" WHERE "name" = '${scriptName}'`;
  const queryPostgres = `SELECT * FROM public."SequelizeMeta" WHERE "name" = '${scriptName}'`;

  const query = nodeEnvIsPostgres ? queryPostgres : querySqlite;

  const metaEntries = (await processModelDbQueryInterface.sequelize.query(query))[0];

  return metaEntries.length > 0;
}

async function checkIfFixForTableIsNeeded(queryInterface, tableName): Promise<boolean> {

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

async function moveProcessModelsFromFlowNodeInstanceDbToProcessModelDb(
  flowNodeInstanceDbQueryInterface,
  processModelDbQueryInterface,
): Promise<void> {

  const processModelsToMove = (await flowNodeInstanceDbQueryInterface.sequelize.query('SELECT * FROM ProcessDefinitions'))[0];

  for (const processModel of processModelsToMove) {

    const escapedXml = processModel.xml.replace(/'/gi, '"');

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

async function moveFlowNodeInstancesFromProcessModelDbToFlowNodeInstanceDb(
  flowNodeInstanceDbQueryInterface,
  processModelDbQueryInterface,
): Promise<void> {

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

async function markMigrationAsRun(processModelDbQueryInterface): Promise<void> {

  const updateQuery = `INSERT INTO "SequelizeMeta" (name) VALUES ('${scriptName}');`;

  await processModelDbQueryInterface.sequelize.query(updateQuery);

}
