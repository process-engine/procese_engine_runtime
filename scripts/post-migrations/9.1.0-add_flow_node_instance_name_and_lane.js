'use strict';
/**
 * At version 9.1.0, the columns "flowNodeLane" and "flowNodenNme" were added to the "FlowNodeInstance" model.
 *
 * This script will retrieve all FlowNodeIntstances from the database, which do not have these properties assigned to them
 * and attempt to fill them out.
 *
 * If the FlowNode belongs to a ProcessModel without lanes, or if it simply was not placed on a lane, the property will remain empty.
 */

const SequelizeConnectionManager = require('@essential-projects/sequelize_connection_manager').SequelizeConnectionManager;
const {BpmnModelParser, ProcessModelFacade} = require('@process-engine/process_engine_core');

const environment = require('./setup/environment_handler');
const badges = environment.badges;

const connectionManager = new SequelizeConnectionManager();
const parser = new BpmnModelParser();

const nodeEnv = process.env.NODE_ENV || 'sqlite';
const nodeEnvIsPostgres = nodeEnv === 'postgres' || nodeEnv === 'test-postgres';

let correlationDbQueryInterface;
let flowNodeInstanceDbQueryInterface;
let processModelDbQueryInterface;

setup()
  .then(getFlowNodeInstancesWithoutNameOrLane)
  .then(addNameAndLaneToFlowNodeInstances)
  .then(() => console.log(`${badges.Info}All Done!`))
  .catch((error) => {
    console.log(`${badges.Error}Failed to execute post-migration script: `, error);
    process.exit(1);
  });

async function setup() {

  environment.initialize();
  await parser.initialize();

  // These will only be set, when using SQLite
  const pathToCorrelationDb = process.env.process_engine__correlation_repository__storage;
  const pathToFlowNodeInstanceDb = process.env.process_engine__flow_node_instance_repository__storage;
  const pathToProcessModelDb = process.env.process_engine__process_model_repository__storage;

  correlationDbQueryInterface = await createConnection('correlation_repository.json', pathToCorrelationDb);
  flowNodeInstanceDbQueryInterface = await createConnection('flow_node_instance_repository.json', pathToFlowNodeInstanceDb);
  processModelDbQueryInterface = await createConnection('process_model_repository.json', pathToProcessModelDb);
}

async function createConnection(repository, sqliteStoragePath) {

  const config = environment.readConfigFile('sqlite', repository);
  config.storage = sqliteStoragePath;

  const sequelizeInstance = await connectionManager.getConnection(config);
  const queryInterface = sequelizeInstance.getQueryInterface();

  return queryInterface;
}

async function getFlowNodeInstancesWithoutNameOrLane() {

  const querySqlite = 'SELECT * FROM "FlowNodeInstances" WHERE "flowNodeName" IS NULL OR "flowNodeLane" IS NULL';
  const queryPostgres = 'SELECT * FROM public."FlowNodeInstances" AS src; WHERE src."flowNodeName" IS NULL OR src."flowNodeLane" IS NULL'

  const query = nodeEnvIsPostgres ? queryPostgres : querySqlite;

  console.log(`${badges.Info}Retrieving all FlowNodeInstances without a name or a lane`);

  const flowNodeInstances = (await flowNodeInstanceDbQueryInterface.sequelize.query(query))[0];

  console.log(`${badges.Info}Found ${flowNodeInstances.length} matching FlowNodeInstances`);
  if(flowNodeInstances.length === 0) {
    console.log(`${badges.Info}Nothing to do here. Exiting...`);
    process.exit(0);
  }

  return flowNodeInstances
}

async function addNameAndLaneToFlowNodeInstances(flowNodeInstances) {

  console.log(`${badges.Info}Adding name and lane to each FlowNodeInstance. Depending of the number of records, this may take a while...`);

  // for-loops are a lot faster than for...of loops.
  // Since it is very possible that we have to process 10.000+ records here, a for-loop is used to speed things up a bit.
  for (let i = 0; i < flowNodeInstances.length; i++) {

    const flowNodeInstance = flowNodeInstances[i];

    console.log(`${badges.Info}Updating FlowNodeInstance ${flowNodeInstance.flowNodeInstanceId}`);

    const processInstance = await getProcessInstanceById(flowNodeInstance.processInstanceId);
    if (!processInstance) {
      console.log(`${badges.Warn}Processinstance ${flowNodeInstance.processInstanceId} not found. Skipping FlowNodeInstance`);
      continue;
    }

    const processDefinition = await getProcessDefinitionByHash(processInstance.processModelHash);
    if (!processDefinition) {
      console.log(`${badges.Warn}ProcessModel ${processInstance.processModelHash} not found. Skipping FlowNodeInstance`);
      continue;
    }

    const parsedProcessDefinition = await parser.parseXmlToObjectModel(processDefinition.xml);

    const processModel = parsedProcessDefinition.processes[0];
    const processModelFacade = new ProcessModelFacade(processModel);

    console.log(`${badges.Info}Retrieving the FlowNodeInstances' name and lane`);
    const flowNodeName = getFlowNodeNameForFlowNodeInstance(flowNodeInstance, processModelFacade);
    const flowNodeLane = getLaneForFlowNodeInstance(flowNodeInstance, processModelFacade);

    await setLaneAndNameForFlowNodeInstance(flowNodeInstance, flowNodeName, flowNodeLane)
  }
}

async function getProcessInstanceById(processInstanceId) {

  const querySqlite = `SELECT * FROM "Correlations" WHERE "processInstanceId" = '${processInstanceId}'`;
  const queryPostgres = `SELECT * FROM public."Correlations" AS src; WHERE src."processInstanceId" = '${processInstanceId}'`

  const query = nodeEnvIsPostgres ? queryPostgres : querySqlite;

  console.log(`${badges.Info}Querying Processinstance ${processInstanceId}`);
  const processInstances = (await correlationDbQueryInterface.sequelize.query(query))[0];

  if(processInstances.length === 0) {
    return undefined;
  }

  return processInstances[0];
}

async function getProcessDefinitionByHash(hash) {

  const querySqlite = `SELECT * FROM "ProcessDefinitions" WHERE "hash" = '${hash}'`;
  const queryPostgres = `SELECT * FROM public."ProcessDefinitions" AS src; WHERE src."hash" = '${hash}'`

  const query = nodeEnvIsPostgres ? queryPostgres : querySqlite;

  console.log(`${badges.Info}Querying ProcessModel with hash ${hash}`);
  const processModels = (await processModelDbQueryInterface.sequelize.query(query))[0];

  if(processModels.length === 0) {
    return undefined;
  }

  return processModels[0]
}

function getFlowNodeNameForFlowNodeInstance(flowNodeInstance, processModelFacade) {

  const flowNode = processModelFacade.getFlowNodeById(flowNodeInstance.flowNodeId);

  console.log(`${badges.Info}The FlowNodeInstance belongs to a FlowNode with name ${flowNode.name}`);
  return flowNode.name;
}

function getLaneForFlowNodeInstance(flowNodeInstance, processModelFacade) {

  const processModelHasNoLanes = !processModelFacade.getProcessModelHasLanes();
  if (processModelHasNoLanes) {
    console.log(`${badges.Info}The ProcessModel has no lanes`);
    return null;
  }

  const laneForFlowNode = processModelFacade.getLaneForFlowNode(flowNodeInstance.flowNodeId);
  if (!laneForFlowNode) {
    console.log(`${badges.Info}The FlowNodeInstance was not executed on any lane`);
    return null;
  }

  console.log(`${badges.Info}FlowNodeInstance was executed on the lane ${laneForFlowNode.name}`);
  return laneForFlowNode.name;
}

async function setLaneAndNameForFlowNodeInstance(flowNodeInstance, name, lane) {
  console.log(`${badges.Info}Updating FlowNodeInstance properties`);
  const query = `UPDATE "FlowNodeInstances" SET "flowNodeName" = '${name}', "flowNodeLane" = '${lane}' WHERE "id" = ${flowNodeInstance.id}`;

  await flowNodeInstanceDbQueryInterface.sequelize.query(query);
}
