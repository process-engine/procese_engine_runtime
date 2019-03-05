'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Call activity tests', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let finishedCorrelationId;

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
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully process a token through a CallActivity', async () => {

    const processModelId = 'call_activity_test';
    const correlationId = uuid.v4();
    const initialToken = {
      operation: 'basic_test',
    };

    let finalResult;

    await new Promise(async (resolve, reject) => {
      const startResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(startResult.processInstanceId, (message) => {
        finalResult = message.currentToken;
        resolve();
      });
    });

    finishedCorrelationId = correlationId;

    should(finalResult.result).be.eql(2, `Expected a result of 2, but got ${finalResult.result}`);
    should(finalResult.endEventId).be.eql('EndEvent_00hkafj', `Unexpected EndEventId: ${finalResult.endEventId}`);
    should(finalResult.endEventName).be.eql('End', `Unexpected EndEventName: ${finalResult.endEventName}`);
  });

  it('should ensure that all ProcessInstances in the previously run Correlation have been set to a finished state', async () => {

    const correlationRepository = await testFixtureProvider.resolveAsync('CorrelationRepository');

    const entries = await correlationRepository.getByCorrelationId(finishedCorrelationId);

    should(entries.length).be.equal(2);

    for (const entry of entries) {
      const assertionErrorMessage = `ProcessInstance ${entry.processInstanceId} in Correlation ${finishedCorrelationId} was not finished!`;
      should(entry.state).be.equal('finished', assertionErrorMessage);
    }
  });

  it('should successfully process a token through two nested CallActivities', async () => {

    const processModelId = 'call_activity_test';
    const correlationId = uuid.v4();
    const initialToken = {
      operation: 'nested_test',
    };

    let finalResult;

    await new Promise(async (resolve, reject) => {
      const startResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(startResult.processInstanceId, (message) => {
        finalResult = message.currentToken;
        resolve();
      });
    });

    should(finalResult.result).be.eql(4, `Expected a result of 4, but got ${finalResult.result}`);
    should(finalResult.endEventId).be.eql('EndEvent_1rlvyot', `Unexpected EndEventId: ${finalResult.endEventId}`);
    should(finalResult.endEventName).be.eql('End', `Unexpected EndEventName: ${finalResult.endEventName}`);
  });

  it('should call an erroneous CallActivity, whose error will be handled by the CallActivity itself', async () => {

    const processModelId = 'call_activity_test_error';
    const correlationId = uuid.v4();
    const initialToken = {
      handle_exception: true,
    };

    let finalResult;

    await new Promise(async (resolve, reject) => {
      const startResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(startResult.processInstanceId, (message) => {
        finalResult = message.currentToken;
        resolve();
      });
    });

    should(finalResult.result).be.match(/error caught by subprocess/i);
    should(finalResult.endEventId).be.eql('EndEvent_1udbard', `Unexpected EndEventId: ${finalResult.endEventId}`);
    should(finalResult.endEventName).be.eql('End', `Unexpected EndEventName: ${finalResult.endEventName}`);
  });

  it('should call an erroneous CallActivity, whose error will be handled by an ErrorBoundaryEvent', async () => {

    const processModelId = 'call_activity_test_error';
    const correlationId = uuid.v4();
    const initialToken = {
      handle_exception: false,
    };

    let finalResult;

    await new Promise(async (resolve, reject) => {
      const startResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(startResult.processInstanceId, (message) => {
        finalResult = message.currentToken;
        resolve();
      });
    });

    should(finalResult).be.match(/error caught by main process boundary event/i);
  });
});
