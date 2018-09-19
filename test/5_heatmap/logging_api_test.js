'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Logging API Tests - ', () => {

  let testFixtureProvider;

  let loggingApiService;

  const processModelId = 'heatmap_sample';
  const correlationId = 'sample_correlation';

  const dummyIdentity = {
    token: 'defaultUser',
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    loggingApiService = await testFixtureProvider.resolveAsync('LoggingApiService');

    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should correctly read and parse all ProcessModel logs that were recorded for the correlation.', async () => {
    const processModelLogs = await loggingApiService.readLogForCorrelation(dummyIdentity, correlationId);
    await assertProcessModelLogs(processModelLogs);
  });

  it('should correctly read and parse all ProcessModel logs that were recorded for the process model.', async () => {
    const processModelLogs = await loggingApiService.readLogForProcessModel(dummyIdentity, correlationId, processModelId);
    await assertProcessModelLogs(processModelLogs);
  });

  it('should correctly read and parse all FlowNodeInstance logs that were recorded for the correlation.', async () => {
    const processModelLogs = await loggingApiService.readLogForCorrelation(dummyIdentity, correlationId);
    await assertFlowNodeInstanceLogs(processModelLogs);
  });

  it('should correctly read and parse all FlowNodeInstance logs that were recorded for the process model.', async () => {
    const processModelLogs = await loggingApiService.readLogForProcessModel(dummyIdentity, correlationId, processModelId);
    await assertFlowNodeInstanceLogs(processModelLogs);
  });

  async function assertProcessModelLogs(logEntries) {

    should(logEntries).be.an.Array();
    should(logEntries.length).be.equal(14);

    const expectedLogMessages = [
      /Process started/i,
      /Process finished/i,
    ];

    for (const logType of expectedLogMessages) {

      const matchingLogEntry = logEntries.find((entry) => {
        return entry.processModelId === processModelId &&
                entry.message.match(logType);
      });

      should.exist(matchingLogEntry, `Failed to retrieve '${logType}' logs for ProcessModel ${processModelId}!`);

      should(matchingLogEntry.correlationId).be.equal(
        correlationId,
        `No correlation was assigned to the '${logType}' log entry of ProcessModel ${processModelId}!`
      );

      should(matchingLogEntry).have.property('logLevel');
      should(matchingLogEntry).have.property('timeStamp');

      should(matchingLogEntry).not.have.property('flowNodeId');
      should(matchingLogEntry).not.have.property('flowNodeInstanceId');
    }
  }

  async function assertFlowNodeInstanceLogs(logEntries) {

    should(logEntries).be.an.Array();
    should(logEntries.length).be.equal(14);

    const expectedLogMessageTypes = [
      /FlowNodeInstance Log Message/i,
      /Another Logged Message/i,
    ];

    const expectedFlowNodeEntries = [
      'StartEvent_1mox3jl',
      'ExclusiveGateway_0fi1ct7',
      'ScriptTask_1',
      'ServiceTask_1',
      'ExclusiveGateway_134ybqm',
      'EndEvent_0eie6q6',
    ];

    for (const flowNodeId of expectedFlowNodeEntries) {
      for (const logType of expectedLogMessageTypes) {

        const matchingLogEntry = logEntries.find((entry) => {
          return entry.flowNodeId === flowNodeId &&
                 entry.message.match(logType);
        });

        should.exist(matchingLogEntry, `Failed to retrieve '${logType}' logs for FlowNode ${flowNodeId}!`);

        should(matchingLogEntry.correlationId).be.equal(
          correlationId,
          `No correlation was assigned to the '${logType}' log entry of FlowNode ${flowNodeId}!`
        );

        should(matchingLogEntry.processModelId).be.equal(
          processModelId,
          `No correlation was assigned to the '${logType}' log entry of FlowNode ${flowNodeId}!`
        );

        should(matchingLogEntry).have.property('flowNodeInstanceId');
        should(matchingLogEntry).have.property('logLevel');
        should(matchingLogEntry).have.property('timeStamp');
      }
    }
  }
});
