const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

// NOTE:
// The consumer api alrady contains extensive testing for this, so there is no need to cover everything here.
// We just need to ensure that all commands get passed correctly to the consumer api and leave the rest up to it.
const testCase = 'GET  ->  /process_models/:process_model_id/correlations/:correlation_id/userTasks';
describe(`Management API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId;

  const processModelId = 'test_management_api_all-tasks';
  let processInstanceId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId);
    correlationId = result.correlationId;
    processInstanceId = result.processInstanceId;

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return all suspended tasks', async () => {

    const taskList = await testFixtureProvider
      .managementApiClient
      .getAllSuspendedTasks(testFixtureProvider.identities.defaultUser);

    assertTaskList(taskList);
  });

  it('should return a correlation\'s tasks by its correlationId', async () => {

    const taskList = await testFixtureProvider
      .managementApiClient
      .getTasksForCorrelation(testFixtureProvider.identities.defaultUser, correlationId);

    assertTaskList(taskList);
  });

  it('should return a process model\'s tasks by its process_model_id', async () => {

    const taskList = await testFixtureProvider
      .managementApiClient
      .getTasksForProcessModel(testFixtureProvider.identities.defaultUser, processModelId);

    assertTaskList(taskList);
  });

  it('should return a process model\'s tasks by its process_instance_id', async () => {

    const taskList = await testFixtureProvider
      .managementApiClient
      .getTasksForProcessInstance(testFixtureProvider.identities.defaultUser, processInstanceId);

    assertTaskList(taskList);
  });

  it('should return a list of tasks for a given process model in a given correlation', async () => {

    const taskList = await testFixtureProvider
      .managementApiClient
      .getTasksForProcessModelInCorrelation(testFixtureProvider.identities.defaultUser, processModelId, correlationId);

    assertTaskList(taskList);
  });

  function assertTaskList(taskList) {
    assertUserTaskList(taskList);
    assertEmptyActivityList(taskList);
    assertManualTaskList(taskList);
  }

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

  function assertManualTaskList(manualTaskList) {

    should(manualTaskList).have.property('manualTasks');

    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.greaterThan(0);

    const manualTask = manualTaskList.manualTasks[0];

    should(manualTask).have.property('id');
    should(manualTask).have.property('flowNodeInstanceId');
    should(manualTask).have.property('name');
    should(manualTask).have.property('correlationId');
    should(manualTask).have.property('processModelId');
    should(manualTask).have.property('processInstanceId');
    should(manualTask).have.property('tokenPayload');
  }

  function assertEmptyActivityList(emptyActivityList) {

    should(emptyActivityList).have.property('emptyActivities');

    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.greaterThan(0);

    const emptyActivity = emptyActivityList.emptyActivities[0];

    should(emptyActivity).have.property('id');
    should(emptyActivity).have.property('flowNodeInstanceId');
    should(emptyActivity).have.property('name');
    should(emptyActivity).have.property('correlationId');
    should(emptyActivity).have.property('processModelId');
    should(emptyActivity).have.property('processInstanceId');
    should(emptyActivity).have.property('tokenPayload');
  }

});
