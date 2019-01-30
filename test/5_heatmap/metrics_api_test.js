'use strict';

const fs = require('fs');
const path = require('path');
const should = require('should');
const uuid = require('node-uuid');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Metric API Tests - ', () => {

  let testFixtureProvider;

  const processModelId = 'heatmap_sample';
  const correlationId = uuid.v4();
  const startEventId = 'StartEvent_1';

  const expectedMetricsFilePath = path.join('test/metrics', `${processModelId}.met`);

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
    await executeSampleProcess();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should write metrics to the expected filepath, using the ProcessModelId as filename.', async () => {
    const metricsAreAtExpectedLocation = fs.existsSync(expectedMetricsFilePath);
    should(metricsAreAtExpectedLocation).be.true(`The metrics were not writen to the expected path '${expectedMetricsFilePath}'!`);
  });

  it('should properly format the metrics when writing them to the file and place each entry to a new line', () => {
    const metrics = readMetricsFile(expectedMetricsFilePath);
    const metricsAreProperlyFormatted = Array.isArray(metrics) && metrics.length > 1;
    should(metricsAreProperlyFormatted).be.true('The metrics are not properly separated by a newline!');
  });

  it('should write entries for each stage of the ProcessModels execution', () => {
    const metrics = readMetricsFile(expectedMetricsFilePath);

    const expectedEntryForProcessStarted = /heatmap_sample.*?onProcessStart/i;
    const expectedEntryForProcessFinished = /heatmap_sample.*?onProcessFinish/i;

    const processStartWasMeasured = metrics.some((entry) => {
      return entry.match(expectedEntryForProcessStarted);
    });
    should(processStartWasMeasured).be.equal(true, 'No process-start metrics were created for ProcessModel \'heatmap_sample\'!');

    const processFinishWasMeasured = metrics.some((entry) => {
      return entry.match(expectedEntryForProcessFinished);
    });

    should(processFinishWasMeasured).be.equal(true, 'No process-finished metrics were created for ProcessModel \'heatmap_sample\'!');
  });

  it('should write entries for each state change of each FlowNodeInstance', () => {
    const metrics = readMetricsFile(expectedMetricsFilePath);

    const expectedMessages = [
      'onFlowNodeEnter',
      'onFlowNodeExit',
    ];

    const expectedFlowNodeEntries = [
      'StartEvent_1',
      'ExclusiveGateway_0fi1ct7',
      'ScriptTask_1',
      'ServiceTask_1',
      'ExclusiveGateway_134ybqm',
      'EndEvent_0eie6q6',
    ];

    for (const flowNodeName of expectedFlowNodeEntries) {
      for (const message of expectedMessages) {

        const expectedMetricEntry = new RegExp(`heatmap_sample.*?${flowNodeName}.*?${message}`, 'i');

        const metricHasMatchingEntry = metrics.some((entry) => {
          return entry.match(expectedMetricEntry);
        });

        should(metricHasMatchingEntry).be.equal(true, `No '${message}' type metrics were created for FlowNode ${flowNodeName}!`);
      }
    }
  });

  async function executeSampleProcess() {

    const initialToken = {
      user_task: false,
    };

    await testFixtureProvider.executeProcess(processModelId, startEventId, correlationId, initialToken);
  }

  function readMetricsFile(filePath) {

    // Don't parse anything here. Leave that to the tests of the logging service, where it belongs.
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const metrics = fileContent.split('\n');

    const metricsWithoutEmptyLines = metrics.filter((entry) => {
      return entry.length > 1; // final empty line length will be 1, because of the \n.
    });

    return metricsWithoutEmptyLines;
  }
});
