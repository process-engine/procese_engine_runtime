'use strict';
const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Send Receive Task - ', () => {

  let testFixtureProvider;

  const processModelId = 'send_receive_task_test';
  const startEventId = 'StartEvent_1';
  const useAutoGeneratedCorrelationId = undefined;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should execute a process with a Send- and a ReceiveTask', async () => {
    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId);

    should(result).have.property('currentToken');
  });
});