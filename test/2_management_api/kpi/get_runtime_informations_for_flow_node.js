'use strict';

const should = require('should');
const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API: GetRuntimeInformationForFlowNode', () => {

  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'kpi_api_test_data';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    it('should successfully get the runtime information for a FlowNode with an odd number of executions', async () => {
      const flowNodeToQuery = 'UserTask_1'; // in the metrics sample file, this task was run 5 times.
      const runtimeInfo = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForFlowNode(defaultIdentity, processModelId, flowNodeToQuery);

      should(runtimeInfo).not.be.an.Array();

      const expectedFlowNodeId = 'UserTask_1';
      const expectedProcessModelId = 'kpi_api_test_data';
      const expectedMinRuntimeInMs = 793;
      const expectedMaxRuntimeInMs = 827;
      const expectedArithmeticMeanRuntimeInMs = 812;
      const expectedFirstQuartileRuntimeInMs = 793;
      const expectedMedianRuntimeInMs = 814;
      const expectedThirdQuartileRuntimeInMs = 827;

      should(runtimeInfo.flowNodeId).be.equal(expectedFlowNodeId);
      should(runtimeInfo.processModelId).be.equal(expectedProcessModelId);
      should(runtimeInfo.minRuntimeInMs).be.equal(expectedMinRuntimeInMs);
      should(runtimeInfo.maxRuntimeInMs).be.equal(expectedMaxRuntimeInMs);
      should(runtimeInfo.arithmeticMeanRuntimeInMs).be.equal(expectedArithmeticMeanRuntimeInMs);
      should(runtimeInfo.firstQuartileRuntimeInMs).be.equal(expectedFirstQuartileRuntimeInMs);
      should(runtimeInfo.medianRuntimeInMs).be.equal(expectedMedianRuntimeInMs);
      should(runtimeInfo.thirdQuartileRuntimeInMs).be.equal(expectedThirdQuartileRuntimeInMs);
    });

    it('should successfully get the runtime information for a FlowNode with an even number of executions', async () => {
      const flowNodeToQuery = 'ScriptTask_1'; // in the metrics sample file, this task was run 20 times.
      const runtimeInfo = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForFlowNode(defaultIdentity, processModelId, flowNodeToQuery);

      should(runtimeInfo).not.be.an.Array();

      const expectedFlowNodeId = 'ScriptTask_1';
      const expectedProcessModelId = 'kpi_api_test_data';
      const expectedMinRuntimeInMs = 9;
      const expectedMaxRuntimeInMs = 13;
      const expectedArithmeticMeanRuntimeInMs = 10;
      const expectedFirstQuartileRuntimeInMs = 9;
      const expectedMedianRuntimeInMs = 10;
      const expectedThirdQuartileRuntimeInMs = 12;

      should(runtimeInfo.flowNodeId).be.equal(expectedFlowNodeId);
      should(runtimeInfo.processModelId).be.equal(expectedProcessModelId);
      should(runtimeInfo.minRuntimeInMs).be.equal(expectedMinRuntimeInMs);
      should(runtimeInfo.maxRuntimeInMs).be.equal(expectedMaxRuntimeInMs);
      should(runtimeInfo.arithmeticMeanRuntimeInMs).be.equal(expectedArithmeticMeanRuntimeInMs);
      should(runtimeInfo.firstQuartileRuntimeInMs).be.equal(expectedFirstQuartileRuntimeInMs);
      should(runtimeInfo.medianRuntimeInMs).be.equal(expectedMedianRuntimeInMs);
      should(runtimeInfo.thirdQuartileRuntimeInMs).be.equal(expectedThirdQuartileRuntimeInMs);
    });
  });

  describe('Security Checks', () => {

    it('should throw a 401 error when no auth token is provided', async () => {
      try {
        await testFixtureProvider
          .managementApiClient
          .getRuntimeInformationForFlowNode({}, processModelId, 'SomeFlowNode');

        should.fail(null, null, 'The request should have failed with code 401!');
      } catch (error) {
        const expectedErrorCode = 401;
        const expectedErrorMessage = /no auth token provided/i;
        should(error).have.properties('code', 'message');
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });
});
