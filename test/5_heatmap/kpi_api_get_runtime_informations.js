'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('KPI API -> Get Runtime Informations - ', () => {

  let testFixtureProvider;

  let kpiApiService;

  const processModelId = 'kpi_api_test_data';

  const dummyIdentity = {
    token: 'defaultUser',
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    kpiApiService = await testFixtureProvider.resolveAsync('KpiApiService');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully get the runtime informations for a ProcessModel', async () => {
    const runtimeInfos = await kpiApiService.getRuntimeInformationForProcessModel(dummyIdentity, processModelId);

    should(runtimeInfos).be.an.Array();
    should(runtimeInfos.length).be.equal(10, `Expected 10 runtime informations, but got ${runtimeInfos.length}.`);

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

      const matchingRuntimeInfo = runtimeInfos.find((runtimeInfo) => {
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

  it('should successfully get the runtime information for a FlowNode with an odd number of executions', async () => {
    const flowNodeToQuery = 'UserTask_1'; // in the metrics sample file, this task was run 5 times.
    const runtimeInfo = await kpiApiService.getRuntimeInformationForFlowNode(dummyIdentity, processModelId, flowNodeToQuery);

    should(runtimeInfo).not.be.an.Array();
    should(runtimeInfo.constructor.name).be.equal('FlowNodeRuntimeInformation');

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
    const runtimeInfo = await kpiApiService.getRuntimeInformationForFlowNode(dummyIdentity, processModelId, flowNodeToQuery);

    should(runtimeInfo).not.be.an.Array();
    should(runtimeInfo.constructor.name).be.equal('FlowNodeRuntimeInformation');

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
