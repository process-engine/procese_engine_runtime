'use strict';

const should = require('should');
const uuid = require('uuid');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Terminate End Event', () => {

  let testFixtureProvider;

  const processModelId = 'terminate_end_event_sample';
  const startEventId = 'StartEvent_1';
  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully terminate a process upon reaching a TerminateEndEvent.', async () => {

    try {
      await testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
      should.fail('error', undefined, 'This should have failed due to a TerminateEndEvent!');
    } catch (error) {
      const expectedError = /process was terminated.*?TerminateEndEvent_1/i;

      // TODO: This only shows the Blackbox Result of the test. To verify that the process- and all corresponding nodes
      // were actually terminated, we need to query the database.
      should(error.message).be.match(expectedError);
    }
  });
});
