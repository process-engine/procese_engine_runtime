'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

// NOTE:
// The consumer api alrady contains extensive testing for this, so there is no need to cover everything here.
// We just need to ensure that all commands get passed correctly to the consumer api and leave the rest up to it.
const testCase = 'GET  ->  /process_models/:process_model_id/correlations/:correlation_id/userTasks';
describe(`Management API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId;

  let userTaskToFinish;

  const processModelId = 'test_management_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a correlation\'s user tasks by its correlationId through the consumer api', async () => {

    const userTaskList = await testFixtureProvider
      .managementApiClientService
      .getUserTasksForCorrelation(testFixtureProvider.identities.defaultUser, correlationId);

    assertUserTaskList(userTaskList);
  });

  it('should return a process model\'s user tasks by its process_model_id through the consumer api', async () => {

    const userTaskList = await testFixtureProvider
      .managementApiClientService
      .getUserTasksForProcessModel(testFixtureProvider.identities.defaultUser, processModelId);

    assertUserTaskList(userTaskList);
  });

  it('should return a list of user tasks for a given process model in a given correlation', async () => {

    const userTaskList = await testFixtureProvider
      .managementApiClientService
      .getUserTasksForProcessModelInCorrelation(testFixtureProvider.identities.defaultUser, processModelId, correlationId);

    userTaskToFinish = userTaskList.userTasks[0];

    assertUserTaskList(userTaskList);
  });

  it('should successfully finish the given user task.', async () => {

    const processInstanceId = userTaskToFinish.processInstanceId;
    const flowNodeInstanceId = userTaskToFinish.flowNodeInstanceId;

    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .managementApiClientService
      .finishUserTask(testFixtureProvider.identities.defaultUser, processInstanceId, correlationId, flowNodeInstanceId, userTaskResult);

    // TODO: There is a gap between the finishing of the UserTask and the end of the ProcessInstance.
    // Mocha resolves and disassembles the backend BEFORE the process was finished, thus leading to inconsistent database entries.
    // This gives the backend some time to finish the process, but we need a more permanent solution for this.
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 3000);
    });
  });

  function assertUserTaskList(userTaskList) {

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
  }

});
