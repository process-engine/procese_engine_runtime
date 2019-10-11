'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

// eslint-disable-next-line
const testCase = 'ConsumerAPI:   POST  ->  /process_models/:process_model_id/start_events/:start_event_id/start?start_callback_type=3&end_event_id=value';
describe(`ConsumerAPI: ${testCase}`, () => {

  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_consumer_api_process_start';
  const processModelIdSublanes = 'test_consumer_api_sublane_process';

  const startCallbackType = StartCallbackType.CallbackOnEndEventReached;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

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
      .consumerApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, startCallbackType, startEventId, endEventId);

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
      .consumerApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, startCallbackType, startEventId, endEventId);

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
      .consumerApiClient
      .startProcessInstance(defaultIdentity, processModelIdSublanes, payload, startCallbackType, startEventId, endEventId);

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

    const laneuserIdentity = testFixtureProvider.identities.userWithAccessToSubLaneC;

    const result = await testFixtureProvider
      .consumerApiClient
      .startProcessInstance(laneuserIdentity, processModelIdSublanes, payload, startCallbackType, startEventId, endEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.a.String();
  });
});
