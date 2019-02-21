'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

const testCase = 'Consumer API:   POST  ->  /process_models/:process_model_id/start_events/:start_event_id/start?start_callback_type=1';
describe(`Consumer API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_consumer_api_process_start';
  const processModelIdSublanes = 'test_consumer_api_sublane_process';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdSublanes,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should start the process and return the correlation ID', async () => {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };
    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessInstanceToEnd(payload.correlationId, processModelId, resolve);

      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);

      should(result).have.property('correlationId');
      should(result.correlationId).be.equal(payload.correlationId);
    });
  });

  it('should start the process and return a generated correlation ID, when none is provided', async () => {

    const startEventId = 'StartEvent_1';
    const payload = {
      inputValues: {},
    };
    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

    return new Promise(async (resolve, reject) => {
      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);

      should(result).have.property('correlationId');

      processInstanceHandler.waitForProcessInstanceToEnd(result.correlationId, processModelId, resolve);
    });
  });

  it('should start the process with using \'on_process_instance_started\' as a default value for return_on', async () => {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessInstanceToEnd(payload.correlationId, processModelId, resolve);

      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload);

      should(result).have.property('correlationId');
      should(result.correlationId).be.equal(payload.correlationId);
    });
  });

  it('should sucessfully execute a process with two different sublanes', async () => {

    const startEventId = 'StartEvent_1';

    const payload = {
      correlationId: uuid.v4(),
      inputValues: {
        test_config: 'different_lane',
      },
    };

    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessInstanceToEnd(payload.correlationId, processModelIdSublanes, resolve);

      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelIdSublanes, startEventId, payload, startCallbackType);

      should(result).have.property('correlationId');
      should(result.correlationId).be.equal(payload.correlationId);
    });
  });

  it('should successfully execute a process with an end event that is on a different sublane', async () => {

    const startEventId = 'StartEvent_1';

    const payload = {
      correlationId: uuid.v4(),
      inputValues: {
        test_config: 'different_lane',
      },
    };

    const userIdentity = testFixtureProvider.identities.userWithAccessToSubLaneC;
    const startCallbackType = StartCallbackType.CallbackOnProcessInstanceFinished;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessInstanceToEnd(payload.correlationId, processModelIdSublanes, resolve);

      const result = await testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(userIdentity, processModelIdSublanes, startEventId, payload, startCallbackType);

      should(result).have.property('correlationId');
      should(result.correlationId).be.equal(payload.correlationId);
    });
  });
});
