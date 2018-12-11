'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs');

describe('ConsumerAPI:   GET  ->  /correlations/:correlation_id/user_tasks', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_usertask';
  const processModelIdNoUserTasks = 'test_consumer_api_usertask_empty';
  const processModelIdCallActivity = 'test_consumer_api_usertask_call_acvtivity';
  const processModelIdCallActivitySubprocess = 'test_consumer_api_usertask_call_acvtivity_subprocess';

  let correlationId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([
      processModelId,
      processModelIdNoUserTasks,
      processModelIdCallActivity,
      processModelIdCallActivitySubprocess,
    ]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should fail to retrieve the Correlation\'s UserTasks, when the user is unauthorized', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForCorrelation({}, correlationId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to retrieve the Correlation\'s UserTasks, when the user is forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForCorrelation(restrictedIdentity, correlationId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should return a Correlation\'s UserTasks by its CorrelationId through the ConsumerAPI', async () => {

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForCorrelation(defaultIdentity, correlationId);

    should(userTaskList).have.property('userTasks');

    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.greaterThan(0);

    const userTask = userTaskList.userTasks[0];

    should(userTask).have.property('id');
    should(userTask).have.property('flowNodeInstanceId');
    should(userTask).have.property('name');
    should(userTask).have.property('correlationId');
    should(userTask).have.property('processModelId');
    should(userTask).have.property('processInstanceId');
    should(userTask).have.property('data');

    should(userTask.data).have.property('formFields');
    should(userTask.data.formFields).be.instanceOf(Array);
    should(userTask.data.formFields.length).be.equal(1);

    const formField = userTask.data.formFields[0];

    should(formField).have.property('id');
    should(formField).have.property('type');
    should(formField).have.property('enumValues');
    should(formField).have.property('label');
    should(formField).have.property('defaultValue');

    await cleanup(userTask);
  });

  it('should return a list of UserTasks from a call activity, by the given correlationId through the ConsumerAPI', async () => {

    const correlationIdCallActivity = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdCallActivity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdCallActivity, processModelIdCallActivitySubprocess);

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForCorrelation(defaultIdentity, correlationIdCallActivity);

    should(userTaskList).have.property('userTasks');

    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.greaterThan(0);

    const userTask = userTaskList.userTasks[0];

    should(userTask).have.property('id');
    should(userTask).have.property('correlationId');
    should(userTask).have.property('processModelId');
    should(userTask).have.property('data');

    should(userTask.data).have.property('formFields');
    should(userTask.data.formFields).be.instanceOf(Array);
    should(userTask.data.formFields.length).be.equal(1);

    const formField = userTask.data.formFields[0];

    should(formField).have.property('id');
    should(formField).have.property('type');
    should(formField).have.property('label');
    should(formField).have.property('defaultValue');

    await cleanup(userTask);
  });

  it('should return an empty Array, if the given correlation does not have any UserTasks', async () => {

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdNoUserTasks);

    await processInstanceHandler.wait(500);

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForProcessModel(defaultIdentity, processModelIdNoUserTasks);

    should(userTaskList).have.property('userTasks');
    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.equal(0);
  });

  it('should return an empty Array, if the correlationId does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForCorrelation(defaultIdentity, invalidCorrelationId);

    should(userTaskList).have.property('userTasks');
    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.equal(0);
  });

  async function cleanup(userTaskToFinishAfterTest) {

    return new Promise(async (resolve, reject) => {
      const userTaskCorrelation = userTaskToFinishAfterTest.correlationId;
      const userTaskProcessModel = userTaskToFinishAfterTest.processModelId;
      const processInstanceId = userTaskToFinishAfterTest.processInstanceId;
      const userTaskId = userTaskToFinishAfterTest.flowNodeInstanceId;
      const userTaskResult = {
        formFields: {
          Form_XGSVBgio: true,
        },
      };

      processInstanceHandler.waitForProcessInstanceToEnd(userTaskCorrelation, userTaskProcessModel, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(defaultIdentity, processInstanceId, userTaskToFinishAfterTest.correlationId, userTaskId, userTaskResult);
    });
  }
});
