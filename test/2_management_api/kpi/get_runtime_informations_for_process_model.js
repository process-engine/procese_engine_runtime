'use strict';

const should = require('should');
const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API: GetRuntimeInformationForProcessModel ', () => {

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

    it('should successfully get the runtime informations for a ProcessModel', async () => {
      const runtimeInfos = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForProcessModel(defaultIdentity, processModelId);

      should(runtimeInfos.flowNodeRuntimeInformation).be.an.Array();
      should(runtimeInfos.flowNodeRuntimeInformation).have.a.lengthOf(10, `Expected 10 runtime informations, but got ${runtimeInfos.flowNodeRuntimeInformation.length}.`);

      const expectedFlowNodeIds = [
        'StartEvent_1mox3jl',
        'ExclusiveGateway_0fi1ct7',
        'ScriptTask_1',
        'ServiceTask_1',
        'ExclusiveGateway_134ybqm',
        'ParallelSplitGateway_1',
        'ParallelJoinGateway_1',
        'UserTask_1',
        'UserTask_2',
        'EndEvent_0eie6q6',
      ];

      for (const flowNodeId of expectedFlowNodeIds) {

        const matchingRuntimeInfo = runtimeInfos.flowNodeRuntimeInformation.find((runtimeInfo) => {
          return runtimeInfo.flowNodeId === flowNodeId;
        });

        should.exist(matchingRuntimeInfo);
        should(matchingRuntimeInfo.processModelId).be.equal('kpi_api_test_data');
        should(matchingRuntimeInfo).have.property('minRuntimeInMs');
        should(matchingRuntimeInfo).have.property('maxRuntimeInMs');
        should(matchingRuntimeInfo).have.property('arithmeticMeanRuntimeInMs');
        should(matchingRuntimeInfo).have.property('firstQuartileRuntimeInMs');
        should(matchingRuntimeInfo).have.property('medianRuntimeInMs');
        should(matchingRuntimeInfo).have.property('thirdQuartileRuntimeInMs');
      }
    });
  });

  describe('Pagination', () => {

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const runtimeInfos = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForProcessModel(defaultIdentity, processModelId, 5);

      should(runtimeInfos.flowNodeRuntimeInformation).be.an.instanceOf(Array);
      should(runtimeInfos.flowNodeRuntimeInformation).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const runtimeInfos = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForProcessModel(defaultIdentity, processModelId, 0, 2);

      should(runtimeInfos.flowNodeRuntimeInformation).be.an.instanceOf(Array);
      should(runtimeInfos.flowNodeRuntimeInformation).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const runtimeInfos = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForProcessModel(defaultIdentity, processModelId, 5, 2);

      should(runtimeInfos.flowNodeRuntimeInformation).be.an.instanceOf(Array);
      should(runtimeInfos.flowNodeRuntimeInformation).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const runtimeInfos = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForProcessModel(defaultIdentity, processModelId, 7, 5);

      should(runtimeInfos.flowNodeRuntimeInformation).be.an.instanceOf(Array);
      should(runtimeInfos.flowNodeRuntimeInformation).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const runtimeInfos = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForProcessModel(defaultIdentity, processModelId, 0, 20);

      should(runtimeInfos.flowNodeRuntimeInformation).be.an.instanceOf(Array);
      should(runtimeInfos.flowNodeRuntimeInformation).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const runtimeInfos = await testFixtureProvider
        .managementApiClient
        .getRuntimeInformationForProcessModel(defaultIdentity, processModelId, 1000);

      should(runtimeInfos.flowNodeRuntimeInformation).be.an.instanceOf(Array);
      should(runtimeInfos.flowNodeRuntimeInformation).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should throw a 401 error when no auth token is provided', async () => {
      try {
        await testFixtureProvider
          .managementApiClient
          .getRuntimeInformationForProcessModel({}, processModelId);

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
