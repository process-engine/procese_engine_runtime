'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs');

describe('Management API:   GET  -> /process_instance/:process_instance_id/process_models/', () => {

  let testFixtureProvider;
  let processInstanceHandler;

  const processModelId = 'heatmap_sample';
  let processInstanceId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId);
    processInstanceId = result.processInstanceId;
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
});
