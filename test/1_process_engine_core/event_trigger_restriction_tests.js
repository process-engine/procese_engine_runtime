'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Event trigger restrictions - ', () => {

  let testFixtureProvider;

  const processModelIdIntermediateEvents = 'intermediate_event_restriction_test';
  const processModelIdEndEvents = 'end_event_restriction_tests';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelIdIntermediateEvents, processModelIdEndEvents]);
  });

  after(async () => {
    // This allows the backend to finish up the remaining database calls.
    // We have no `ProcessErrorNotification` yet, so we need to work with a timeout here.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await testFixtureProvider.tearDown();
  });

  it('should fail to trigger an IntermediateMessageEvent, if the user cannot access the lane.', async () => {

    try {
      const startEventId = 'StartEvent_1';
      const result = await testFixtureProvider.executeProcess(processModelIdIntermediateEvents, startEventId);
      should.fail(result, undefined, 'This request should have failed, because the user cannot access the lane!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to trigger an IntermediateSignalEvent, if the user cannot access the lane.', async () => {

    try {
      const startEventId = 'StartEvent_2';
      const result = await testFixtureProvider.executeProcess(processModelIdIntermediateEvents, startEventId);
      should.fail(result, undefined, 'This request should have failed, because the user cannot access the lane!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to trigger a MessageEndEvent, if the user cannot access the lane.', async () => {

    try {
      const startEventId = 'StartEvent_1';
      const result = await testFixtureProvider.executeProcess(processModelIdEndEvents, startEventId);
      should.fail(result, undefined, 'This request should have failed, because the user cannot access the lane!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to trigger an SignalEndEvent, if the user cannot access the lane.', async () => {

    try {
      const startEventId = 'StartEvent_2';
      const result = await testFixtureProvider.executeProcess(processModelIdEndEvents, startEventId);
      should.fail(result, undefined, 'This request should have failed, because the user cannot access the lane!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });
});
