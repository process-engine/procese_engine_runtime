'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

// NOTE:
// The consumer api alrady contains extensive testing for this, so there is no need to cover everything here.
// We just need to ensure that all commands get passed correctly to the consumer api and leave the rest up to it.
const testCase = 'GET  ->  /process_models/:process_model_id/correlations/:correlation_id/empty_activities';
describe(`Management API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId;
  let processInstanceId;

  let emptyActivityToFinish;

  const processModelId = 'test_management_api_emptyactivity';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId);
    correlationId = result.correlationId;
    processInstanceId = result.processInstanceId;

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a correlation\'s EmptyActivities by its correlationId through the consumer api', async () => {

    const emptyActivityList = await testFixtureProvider
      .managementApiClientService
      .getEmptyActivitiesForCorrelation(testFixtureProvider.identities.defaultUser, correlationId);

    assertemptyActivityList(emptyActivityList);
  });

  it('should return a process model\'s EmptyActivities by its process_model_id through the consumer api', async () => {

    const emptyActivityList = await testFixtureProvider
      .managementApiClientService
      .getEmptyActivitiesForProcessModel(testFixtureProvider.identities.defaultUser, processModelId);

    assertemptyActivityList(emptyActivityList);
  });

  it('should return a process model\'s EmptyActivities by its process_instance_id through the consumer api', async () => {

    const emptyActivityList = await testFixtureProvider
      .managementApiClientService
      .getEmptyActivitiesForProcessInstance(testFixtureProvider.identities.defaultUser, processInstanceId);

    assertemptyActivityList(emptyActivityList);
  });

  it('should return a list of EmptyActivities for a given process model in a given correlation', async () => {

    const emptyActivityList = await testFixtureProvider
      .managementApiClientService
      .getEmptyActivitiesForProcessModelInCorrelation(testFixtureProvider.identities.defaultUser, processModelId, correlationId);

    emptyActivityToFinish = emptyActivityList.emptyActivities[0];

    assertemptyActivityList(emptyActivityList);
  });

  it('should successfully finish the given EmptyActivity.', async () => {

    // NOTE: There is a gap between the finishing of the EmptyActivity and the end of the ProcessInstance.
    // Mocha resolves and disassembles the backend BEFORE the process was finished, thus leading to inconsistent database entries.
    // To avoid a messed up database that could break other tests, we must wait here for the process to finish, before finishing the test.
    return new Promise(async (resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivityToFinish.processInstanceId, resolve);

      // Now finish the EmptyActivity.
      await testFixtureProvider
        .managementApiClientService
        .finishEmptyActivity(
          testFixtureProvider.identities.defaultUser,
          emptyActivityToFinish.processInstanceId,
          correlationId,
          emptyActivityToFinish.flowNodeInstanceId,
        );
    });
  });

  function assertemptyActivityList(emptyActivityList) {

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
