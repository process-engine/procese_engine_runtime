const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Parallel Gateway execution', () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const startEventId = 'StartEvent_1';

  const processModelId = 'parallel_gateway_test';
  const parallelGatewayFinishTestId = 'parallel_gateway_finish_test';
  const processModelIdUnsupported = 'parallel_gateway_unsupported_test';
  const processModelParallelEmptyActivitiesId = 'empty_activity_test';
  const processModelParallelManualTasksId = 'manual_task_parallel_test';
  const processModelParallelUserTasksId = 'user_task_parallel_test';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processDefFileList = [
      processModelId,
      processModelIdUnsupported,
      processModelParallelEmptyActivitiesId,
      processModelParallelManualTasksId,
      processModelParallelUserTasksId,
      parallelGatewayFinishTestId,
    ];

    await testFixtureProvider.importProcessFiles(processDefFileList);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully run multiple parallel branches and return each result with the final result token.', async () => {

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);

    const expectedHistoryEntryForTask1 = 'st_longTask';
    const expectedHistoryEntryForTask2 = 'st_veryLongTask';
    const expectedHistoryEntryForTask3 = 'st_secondVeryLongTask';
    const expectedHistoryEntryForTokenTestTask = 'st_currentTokenTestPart2';
    const expectedHistoryEntryForSequence3 = 'st_SequenceTestTask3';

    should(result).have.property('currentToken');
    should(result.currentToken).have.keys(
      expectedHistoryEntryForTask1,
      expectedHistoryEntryForTask2,
      expectedHistoryEntryForTask3,
      expectedHistoryEntryForTokenTestTask,
      expectedHistoryEntryForSequence3,
    );
    should(result.currentToken[expectedHistoryEntryForTask1]).be.equal('longRunningFunction has finished');
    should(result.currentToken[expectedHistoryEntryForTask2]).be.equal('veryLongRunningFunction has finished');
    should(result.currentToken[expectedHistoryEntryForTask3]).be.equal('secondVeryLongRunningFunction has finished');
    should(result.currentToken[expectedHistoryEntryForTokenTestTask]).be.equal('current token test value');
    should(result.currentToken[expectedHistoryEntryForSequence3]).be.equal('UPDATED Script Task result for sequence test');
  });

  it('should finish two parallel running UserTasks', async () => {

    const correlationId = uuid.v4();

    testFixtureProvider.executeProcess(processModelParallelUserTasksId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelParallelUserTasksId, 2);

    const currentRunningUserTasks = await processInstanceHandler.getWaitingUserTasksForCorrelationId(defaultIdentity, correlationId);

    should(currentRunningUserTasks).have.property('userTasks');
    should(currentRunningUserTasks.userTasks).have.size(2, 'There should be two waiting UserTasks');

    const waitingUsersTasks = currentRunningUserTasks.userTasks;

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(waitingUsersTasks[0].processInstanceId, resolve);

      for (const userTask of waitingUsersTasks) {
        await testFixtureProvider
          .consumerApiClient
          .finishUserTask(defaultIdentity, userTask.processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskInput);
      }
    });
  });

  it('should finish two parallel running manual tasks', async () => {

    const correlationId = uuid.v4();

    testFixtureProvider.executeProcess(processModelParallelManualTasksId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelParallelManualTasksId, 2);

    const currentRunningManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(defaultIdentity, correlationId);

    should(currentRunningManualTasks).have.property('manualTasks');
    should(currentRunningManualTasks.manualTasks).have.size(2, 'There should be two waiting manual tasks');

    const waitingManualsTasks = currentRunningManualTasks.manualTasks;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(waitingManualsTasks[0].processInstanceId, resolve);

      for (const manualTask of waitingManualsTasks) {
        await testFixtureProvider
          .consumerApiClient
          .finishManualTask(defaultIdentity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);
      }
    });
  });

  it('should finish parallel gateway by finished flow nodes', async () => {

    const correlationId = uuid.v4();
    const payload = {
      correlationId: correlationId,
    };
    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, parallelGatewayFinishTestId, payload, returnOn);

    should(result.tokenPayload).have.size(2, 'There should be two waiting manual tasks');
    should(result.tokenPayload).have.property('ExclusiveGateway1');
    should(result.tokenPayload).have.property('ScriptTask1');
  });

  it('should finish two parallel running EmptyActivities', async () => {

    const startEventIdToUse = 'StartEvent_3';
    const correlationId = uuid.v4();
    const samplePayload = {
      test: 'value',
    };

    testFixtureProvider.executeProcess(processModelParallelEmptyActivitiesId, startEventIdToUse, correlationId, samplePayload);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelParallelEmptyActivitiesId, 2);

    const waitingEmptyActivities = await processInstanceHandler.getWaitingEmptyActivitiesForCorrelationId(defaultIdentity, correlationId);

    should(waitingEmptyActivities).have.property('emptyActivities');
    should(waitingEmptyActivities.emptyActivities).have.size(2, 'There should be two waiting EmptyActivities');

    const emptyActivities = waitingEmptyActivities.emptyActivities;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivities[0].processInstanceId, resolve);

      for (const emptyActivity of emptyActivities) {
        await testFixtureProvider
          .consumerApiClient
          .finishEmptyActivity(defaultIdentity, emptyActivity.processInstanceId, correlationId, emptyActivity.flowNodeInstanceId);
      }
    });
  });

  it('should fail to execute a gateway with mixed Split- and Join- purpose', async () => {

    try {
      const result = await testFixtureProvider.executeProcess(processModelIdUnsupported, startEventId);
      should.fail('error', result, 'This should have failed, because mixed gateways are not supported!');
    } catch (error) {
      const expectedErrorMessage = /not supported/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });
});
