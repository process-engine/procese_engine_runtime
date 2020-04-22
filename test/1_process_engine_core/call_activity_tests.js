'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Call activity tests', () => {

  let testFixtureProvider;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    const processDefFileList = [
      'call_activity_subprocess',
      'call_activity_subprocess_error',
      'call_activity_subprocess_nested',
      'call_activity_test',
      'call_activity_test_error',
    ];

    await testFixtureProvider.importProcessFiles(processDefFileList);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully execute a CallActivity, using default values for payload and StartEventId', async () => {

    const processModelId = 'call_activity_test';
    const correlationId = uuid.v4();
    const initialToken = {
      operation: 'basic_test',
    };

    const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_1', correlationId, initialToken);

    const finalToken = result.currentToken;

    should(finalToken.result).be.eql(2, `Expected a result of 2, but got ${finalToken.result}`);
    should(finalToken.endEventId).be.eql('EndEvent_00hkafj', `Unexpected EndEventId: ${finalToken.endEventId}`);
    should(finalToken.endEventName).be.eql('EndEvent 1', `Unexpected EndEventName: ${finalToken.endEventName}`);
  });

  it('should start the CallActivity from the given StartEventId', async () => {

    const processModelId = 'call_activity_test';
    const correlationId = uuid.v4();
    const initialToken = {};

    const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_TestAttachedStartEventId', correlationId, initialToken);

    const finalToken = result.currentToken;

    should(finalToken.result).be.eql({}, `Expected an empty result, but got ${finalToken.result}`);
    should(finalToken.endEventId).be.eql('EndEvent_1obbzk2', `Unexpected EndEventId: ${finalToken.endEventId}`);
    should(finalToken.endEventName).be.eql('EndEvent 2', `Unexpected EndEventName: ${finalToken.endEventName}`);
  });

  it('should pass the configured payload to the CallActivity', async () => {

    const processModelId = 'call_activity_test';
    const correlationId = uuid.v4();
    const initialToken = {};

    const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_TestAttachedPayload', correlationId, initialToken);

    const finalToken = result.currentToken;

    should(finalToken.result).be.eql(12345, `Unexpected result: ${finalToken.result}`);
    should(finalToken.endEventId).be.eql('EndEvent_1obbzk2', `Unexpected EndEventId: ${finalToken.endEventId}`);
    should(finalToken.endEventName).be.eql('EndEvent 2', `Unexpected EndEventName: ${finalToken.endEventName}`);
  });

  it('should be able to use a payload that uses token expressions', async () => {

    const processModelId = 'call_activity_test';
    const correlationId = uuid.v4();
    const initialToken = 'Hello World';

    const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_TestTokenizedPayload', correlationId, initialToken);

    const finalToken = result.currentToken;

    const expectedResult = {
      bla: 'Hello World',
    };

    should(finalToken.result).be.eql(expectedResult, `Unexpected result: ${finalToken.result}`);
    should(finalToken.endEventId).be.eql('EndEvent_1obbzk2', `Unexpected EndEventId: ${finalToken.endEventId}`);
    should(finalToken.endEventName).be.eql('EndEvent 2', `Unexpected EndEventName: ${finalToken.endEventName}`);
  });

  it('should successfully handle nested CallActivities', async () => {

    const processModelId = 'call_activity_test';
    const correlationId = uuid.v4();
    const initialToken = {
      operation: 'nested_test',
    };

    const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_1', correlationId, initialToken);

    const finalToken = result.currentToken;

    should(finalToken.result).be.eql(4, `Expected a result of 4, but got ${finalToken.result}`);
    should(finalToken.endEventId).be.eql('EndEvent_1rlvyot', `Unexpected EndEventId: ${finalToken.endEventId}`);
    should(finalToken.endEventName).be.eql('End', `Unexpected EndEventName: ${finalToken.endEventName}`);
  });

  it('should successfully handle an error from a called CallActivity', async () => {

    const processModelId = 'call_activity_test_error';
    const correlationId = uuid.v4();
    const initialToken = {
      handle_exception: true,
    };

    const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_1', correlationId, initialToken);

    const finalToken = result.currentToken;

    should(finalToken.result).be.match(/error caught by subprocess/i);
    should(finalToken.endEventId).be.eql('EndEvent_1udbard', `Unexpected EndEventId: ${finalToken.endEventId}`);
    should(finalToken.endEventName).be.eql('End', `Unexpected EndEventName: ${finalToken.endEventName}`);
  });

  it('should successfully handle a CallActivity that handled an error internally', async () => {

    const processModelId = 'call_activity_test_error';
    const correlationId = uuid.v4();
    const initialToken = {
      handle_exception: false,
    };

    const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_1', correlationId, initialToken);

    should(result.currentToken).be.match(/error caught by main process boundary event/i);
  });

  it('should throw an error, if the attached StartEventId does not exist on the CallActivity', async () => {
    try {
      const processModelId = 'call_activity_test';
      const correlationId = uuid.v4();
      const initialToken = {};

      const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_TestInvalidStartEventId', correlationId, initialToken);
      should.fail(result, undefined, 'This should have failed, because the CallActivity does not have the configured start event!');
    } catch (error) {
      const expectedErrorMessage = /no matching startevent/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
      should(error.additionalInformation).have.a.property('configuredStartEventId');
      should(error.additionalInformation.configuredStartEventId).be.equal('InvalidStartEventID');
    }
  });

  it('should throw an error, if the configured payload is invalid', async () => {
    try {
      const processModelId = 'call_activity_test';
      const correlationId = uuid.v4();
      const initialToken = {};

      const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_TestInvalidPayload', correlationId, initialToken);
    } catch (error) {
      const expectedErrorMessage = /payload configuration.*?invalid/i;
      const expectedErrorCode = 500;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });
});
