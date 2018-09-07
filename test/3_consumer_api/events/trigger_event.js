'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').FixtureProviderConsumerApi;

describe('Consumer API: POST  ->  /process_models/:process_model_id/correlations/:correlation_id/events/:event_id/trigger', () => {

  let testFixtureProvider;
  let consumerContext;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    consumerContext = testFixtureProvider.context.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully trigger the given event.', async () => {

    // TODO: Replace with real values
    const processModelId = 'test_consumer_api_trigger_event';
    const correlationId = 'correlationId';
    const eventId = 'test_event_to_trigger';
    const eventTriggerPayload = {};

    await testFixtureProvider
      .consumerApiClientService
      .triggerEvent(consumerContext, processModelId, correlationId, eventId, eventTriggerPayload);
  });

  it('should fail trigger the event, when the user is unauthorized', async () => {

    const processModelId = 'test_consumer_api_trigger_event';
    const correlationId = 'correlationId';
    const eventId = 'test_event_to_trigger';
    const eventTriggerPayload = {};

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerEvent({}, processModelId, correlationId, eventId, eventTriggerPayload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail trigger the event, when the user forbidden to retrieve it', async () => {

    const processModelId = 'test_consumer_api_trigger_event';
    const correlationId = 'correlationId';
    const eventId = 'test_event_to_trigger';
    const eventTriggerPayload = {};

    const restrictedContext = testFixtureProvider.context.restrictedUser;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerEvent(restrictedContext, processModelId, correlationId, eventId, eventTriggerPayload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail to trigger the event, if the given process_model_id does not exist', async () => {

    // TODO: Replace with real values
    const processModelId = 'invalidprocessModelId';
    const correlationId = 'correlationId';
    const eventId = 'test_event_to_trigger';
    const eventTriggerPayload = {};

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerEvent(consumerContext, processModelId, correlationId, eventId, eventTriggerPayload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /process model id not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail to trigger the event, if the given correlation_id does not exist', async () => {

    // TODO: Replace with real values
    const processModelId = 'test_consumer_api_trigger_event';
    const correlationId = 'invalidcorrelation';
    const eventId = 'test_event_to_trigger';
    const eventTriggerPayload = {};

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerEvent(consumerContext, processModelId, correlationId, eventId, eventTriggerPayload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /process model id not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail to trigger the event, if the given event_id does not exist', async () => {

    // TODO: Replace with real values
    const processModelId = 'test_consumer_api_trigger_event';
    const correlationId = 'correlationId';
    const invalidEventId = 'invalidEventId';
    const eventTriggerPayload = {};

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerEvent(consumerContext, processModelId, correlationId, invalidEventId, eventTriggerPayload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /user task id not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail to trigger the event, if the given payload is invalid', async () => {

    // TODO: Replace with real values
    const processModelId = 'test_consumer_api_trigger_event';
    const correlationId = 'correlationId';
    const eventId = 'test_event_to_trigger';
    const eventTriggerPayload = {};

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerEvent(consumerContext, processModelId, correlationId, eventId, eventTriggerPayload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 400;
      const expectedErrorMessage = /invalid arguments/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  // TODO: Find a way to simulate a process error
  it.skip('should fail, if attempting to trigger the event caused an error', async () => {

    // TODO: Replace with real values
    const processModelId = 'test_consumer_api_trigger_event';
    const correlationId = 'correlationId';
    const eventId = 'invalideventId';
    const eventTriggerPayload = {};

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerEvent(consumerContext, processModelId, correlationId, eventId, eventTriggerPayload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 500;
      const expectedErrorMessage = /could not be finished/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
