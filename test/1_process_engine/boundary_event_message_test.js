'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Message Boundary Event - ', () => {

  let testFixtureProvider;

  const processModelId = 'boundary_event_message_test';
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should interrupt the running service task when a message arrives', async () => {

    const expectedResult = /message received/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);

    should(result.currentToken).be.match(expectedResult);
  });
});
