'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

const testCase = 'Consumer API:   POST  ->  /process_models/:process_model_id/start_events/:start_event_id/start';
describe(`Consumer API: ${testCase}`, () => {

  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_consumer_api_process_start';
  const processModelIdNonExecutable = 'test_consumer_api_non_executable_process';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdNonExecutable,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should fail to start the process, if the given process_model_id does not exist', async () => {

    const invalidProcessModelId = 'invalidprocessModelId';
    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

    try {
      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, invalidProcessModelId, startEventId, payload, startCallbackType);

      should.fail(result, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to start the process, if the given start_event_id does not exist', async () => {

    const startEventId = 'invalidStartEventId';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

    try {
      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);

      should.fail(result, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /startevent.*?not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to start the process, if the given end_event_id does not exist', async () => {

    const startEventId = 'StartEvent_1';
    const endEventId = 'invalidEndEventId';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const startCallbackType = StartCallbackType.CallbackOnEndEventReached;

    try {
      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType, endEventId);

      should.fail(result, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /endevent.*?not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to start the process, if the process model is not marked as executable', async () => {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

    try {
      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelIdNonExecutable, startEventId, payload, startCallbackType);

      should.fail(result, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 400;
      const expectedErrorMessage = /not executable/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to start the process, if the given startCallbackType option is invalid', async () => {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const startCallbackType = 'invalidReturnOption';

    try {
      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);

      should.fail(result, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 400;
      const expectedErrorMessage = /not a valid return option/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail, if the request was aborted before the desired return_on event was reached', async () => {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {
        causeError: true,
      },
    };

    // NOTE: This test case can by its very definition never work with .CallbackOnProcessInstanceCreated".
    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceFinished;

    try {
      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);

      should.fail(result, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 500;
      const expectedErrorMessage = /critical error/i;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });
});
