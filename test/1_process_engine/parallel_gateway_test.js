'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Parallel Gateway execution', () => {

  let testFixtureProvider;

  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    const processDefFileList = ['parallel_gateway_test'];
    await testFixtureProvider.importProcessFiles(processDefFileList);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully run two parallel tasks and contain the result of each task in the token history.', async () => {

    const processModelId = 'parallel_gateway_test';
    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);

    const expectedHistoryEntryForTask1 = 'st_longTask';
    const expectedHistoryEntryForTask2 = 'st_veryLongTask';
    const expectedHistoryEntryForTask3 = 'st_secondVeryLongTask';
    const expectedHistoryEntryForTokenTestTask = 'st_currentTokenTestPart2';
    const expectedHistoryEntryForSequence3 = 'st_SequenceTestTask3';

    should(result).have.property('currentToken');
    should(result.currentToken).have.keys(
      expectedHistoryEntryForTask1,
      expectedHistoryEntryForTask2,
      expectedHistoryEntryForTask3,
      expectedHistoryEntryForTokenTestTask,
      expectedHistoryEntryForSequence3);
    should(result.currentToken[expectedHistoryEntryForTask1]).be.equal('longRunningFunction has finished');
    should(result.currentToken[expectedHistoryEntryForTask2]).be.equal('veryLongRunningFunction has finished');
    should(result.currentToken[expectedHistoryEntryForTask3]).be.equal('secondVeryLongRunningFunction has finished');
    should(result.currentToken[expectedHistoryEntryForTokenTestTask]).be.equal('current token test value');
    should(result.currentToken[expectedHistoryEntryForSequence3]).be.equal('UPDATED Script Task result for sequence test');
  });
});
