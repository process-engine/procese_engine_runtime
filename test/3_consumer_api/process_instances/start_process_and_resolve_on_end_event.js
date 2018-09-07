'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').StartCallbackType; //eslint-disable-line

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

// eslint-disable-next-line
const testCase = 'Consumer API:   POST  ->  /process_models/:process_model_id/start_events/:start_event_id/start?start_callback_type=3&end_event_id=value';
describe(`Consumer API: ${testCase}`, () => {

  let testFixtureProvider;
  let consumerContext;

  const processModelId = 'test_consumer_api_process_start';
  const processModelIdSublanes = 'test_consumer_api_sublane_process';

  const startCallbackType = StartCallbackType.CallbackOnEndEventReached;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    consumerContext = testFixtureProvider.context.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdSublanes,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should start the process and return the provided correlation ID, after the given end event was reached', async () => {

    const startEventId = 'StartEvent_1';
    const endEventId = 'EndEvent_Success';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const result = await testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(consumerContext, processModelId, startEventId, payload, startCallbackType, endEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);
  });

  it('should start the process, wait until the end event was reached and return a generated correlation ID, when none is provided', async () => {

    const startEventId = 'StartEvent_1';
    const endEventId = 'EndEvent_Success';
    const payload = {
      inputValues: {},
    };

    const result = await testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(consumerContext, processModelId, startEventId, payload, startCallbackType, endEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.a.String();
  });

  it('should execute a process with sublanes, when the user can access all lanes', async () => {

    const startEventId = 'StartEvent_1';
    const endEventId = 'EndEvent_1';

    const payload = {
      inputValues: {
        test_config: 'same_lane',
      },
    };

    const result = await testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(consumerContext, processModelIdSublanes, startEventId, payload, startCallbackType, endEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.a.String();
  });

  it('should execute a process with sublanes, when the user can only access one sublane and process execution never changes sublanes', async () => {

    const startEventId = 'StartEvent_1';
    const endEventId = 'EndEvent_1';

    const payload = {
      inputValues: {
        test_config: 'same_lane',
      },
    };

    const laneuserContext = testFixtureProvider.context.userWithAccessToSubLaneC;

    const result = await testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(laneuserContext, processModelIdSublanes, startEventId, payload, startCallbackType, endEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.a.String();
  });
});
