'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

const testCase = 'GET  ->  /process_instances/:process_instance_id/flow_node_instances';
describe(`ManagementAPI: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId;
  let processInstanceId;
  const processModelId = 'test_management_api_generic_sample';

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

  it('should return a list of flow node instances', async () => {

    const flowNodeInstances = await testFixtureProvider
      .managementApiClient
      .getFlowNodeInstancesForProcessInstance(testFixtureProvider.identities.defaultUser, processInstanceId);

    assertFlowNodeInstances(flowNodeInstances.flowNodeInstances);
  });

  async function createFinishedProcessInstance() {

    await new Promise(async (resolve) => {
      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId);
      processInstanceId = result.processInstanceId;
      correlationId = result.correlationId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);
    });
  }

  function assertFlowNodeInstances(flowNodeInstances) {
    should(flowNodeInstances).be.an.Array();
    should(flowNodeInstances.length).be.greaterThan(0);

    for (const flowNodeInstance of flowNodeInstances) {
      should(flowNodeInstance).have.property('id');
      should(flowNodeInstance).have.property('flowNodeId');
      should(flowNodeInstance).have.property('flowNodeType');
      should(flowNodeInstance).have.property('correlationId');
      should(flowNodeInstance).have.property('processModelId');
      should(flowNodeInstance).have.property('processInstanceId');
      should(flowNodeInstance).have.property('tokens');
      should(flowNodeInstance).have.property('state');
      should(flowNodeInstance).have.property('owner');

      should(flowNodeInstance.correlationId).be.equal(correlationId);
      should(flowNodeInstance.processModelId).be.equal(processModelId);
      should(flowNodeInstance.processInstanceId).be.equal(processInstanceId);

      const hasOnEnterToken = flowNodeInstance.tokens.some((token) => token.type === 'onEnter');
      const hasOnExitToken = flowNodeInstance.tokens.some((token) => token.type === 'onExit');

      should(hasOnEnterToken).be.true();
      should(hasOnExitToken).be.true();
    }
  }

});
