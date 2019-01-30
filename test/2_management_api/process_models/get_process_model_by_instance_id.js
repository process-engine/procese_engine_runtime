'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   GET  -> /process_instance/:process_instance_id/process_model/', () => {

  let testFixtureProvider;
  let processInstanceHandler;

  const processModelId = 'test_consumer_api_correlation_result';
  let processInstanceId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await createFinishedProcessInstance();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a process model by its process_instance_id through the management api', async () => {

    const processModel = await testFixtureProvider
      .managementApiClientService
      .getProcessModelByProcessInstanceId(testFixtureProvider.identities.defaultUser, processInstanceId);

    should(processModel).have.property('id');
    should(processModel).have.property('xml');
    should(processModel).have.property('startEvents');
    should(processModel).have.property('endEvents');
    should(processModel.startEvents.length).be.greaterThan(0);
    should(processModel.endEvents.length).be.greaterThan(0);
  });

  async function createFinishedProcessInstance() {
    return new Promise(async (resolve, reject) => {
      const correlationId = uuid.v4();
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, resolve);

      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId);
      processInstanceId = result.processInstanceId;
    });
  }
});
