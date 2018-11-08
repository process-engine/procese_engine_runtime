'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

describe('Consumer API:   GET  ->  /correlations/:correlation_id/user_tasks', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let correlationId;

  const processModelId = 'test_consumer_api_usertask';
  const processModelIdNoUserTasks = 'test_consumer_api_usertask_empty';
  const processModelIdCallActivity = 'test_consumer_api_usertask_call_acvtivity';
  const processModelIdCallActivitySubprocess = 'test_consumer_api_usertask_call_acvtivity_subprocess';

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
    await finishWaitingUserTasksAfterTests();
    await testFixtureProvider.tearDown();
  });

  async function finishWaitingUserTasksAfterTests() {
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(defaultIdentity, processModelId, correlationId, 'Task_1vdwmn1', userTaskResult);
  }

  it('should return a correlation\'s user tasks by its correlationId through the consumer api', async () => {

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForCorrelation(defaultIdentity, correlationId);

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
    should(formField).have.property('enumValues');
    should(formField).have.property('label');
    should(formField).have.property('defaultValue');
  });

  it('should return a list of user tasks from a call activity, by the given correlationId through the consumer api', async () => {

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

    const userTaskResult = {
      formFields: {
        FormField_01comr3: 'result',
      },
    };

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(defaultIdentity, processModelIdCallActivitySubprocess, correlationIdCallActivity, 'UserTaskTestCallActivity_1', userTaskResult);
  });

  it('should return an empty Array, if the given correlation does not have any user tasks', async () => {

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

  it('should fail to retrieve the correlation\'s user tasks, when the user is unauthorized', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForCorrelation({}, correlationId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the correlation\'s user tasks, when the user forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForCorrelation(restrictedIdentity, correlationId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
