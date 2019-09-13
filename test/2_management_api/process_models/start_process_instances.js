const should = require('should');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI: POST  ->  /process_models/:process_model_id/start?start_callback_type=1&start_event_id=:start_event_id', () => {

  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_management_api_process_start';
  const processModelMultipleStartEventsId = 'test_management_api_multiple_start_events';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelMultipleStartEventsId,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should start and finish a ProcessInstance with one start event, if the payload not provided', async () => {
    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelId, undefined, returnOn);

    should(result.tokenPayload).be.eql('process instance started');
  });

  it('should start and finish a ProcessInstance with one start event, if the StartEventId is not provided', async () => {
    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;
    const payload = {
      causeError: false,
    };

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, returnOn);

    should(result.tokenPayload).be.eql('process instance started');
  });

  it('should start and finish a ProcessInstance with one StartEvent and the provided StartEventId', async () => {
    const startEventId = 'StartEvent_1';
    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;
    const payload = {
      causeError: false,
    };

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, returnOn, startEventId);

    should(result.tokenPayload).be.eql('process instance started');
  });

  it('should start a ProcessInstance with multiple StartEvents with a specific StartEventId', async () => {
    const startEventId = 'StartEvent_2';
    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;
    const payload = {};

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelMultipleStartEventsId, payload, returnOn, startEventId);

    should(result.tokenPayload).be.eql(2);
  });

  it('should throw a NotFound error, when trying to start a ProcessInstance with a StartEventId that does not exists', async () => {
    const startEventId = 'StartEvent_1337';
    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;
    const payload = {};

    try {
      const result = await testFixtureProvider
        .managementApiClient
        .startProcessInstance(defaultIdentity, processModelMultipleStartEventsId, payload, returnOn, startEventId);

      should.fail(result, undefined, 'This request should have failed!');
    } catch (error) {

      const expectedErrorCode = 404;
      const expectedErrorMessage = /start.*event.*not found/i;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should throw a BadRequest Error when providing no StartEventId on a Process with multiple StartEvents', async () => {
    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;
    const payload = {};

    try {
      const result = await testFixtureProvider
        .managementApiClient
        .startProcessInstance(defaultIdentity, processModelMultipleStartEventsId, payload, returnOn);

      should.fail(result, undefined, 'The Process should not have been executed.');
    } catch (error) {

      const expectedErrorCode = 400;
      const expectedErrorMessage = /multiple.*start.*events/i;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });
});
