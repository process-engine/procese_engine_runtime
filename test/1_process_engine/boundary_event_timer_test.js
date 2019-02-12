'use strict';

const uuid = require('node-uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Timer Boundary Event - ', () => {

  let defaultIdentity;
  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  const processModelId = 'boundary_event_timer_test';
  const startEventId = 'StartEvent_1';
  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should interrupt a task after one second', async () => {

    const initialToken = {
      interrupt_task: true,
    };

    const expectedResult = /interrupt successful/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, correlationId, initialToken);

    should(result.currentToken).be.match(expectedResult);
  });

  it('should no longer list the task as active, after it was interrupted', async () => {

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(userTaskList.userTasks).be.an.Array();
    should(userTaskList.userTasks).be.length(0, 'The UserTask was not interrupted properly!');
  });

  it('should not interrupt a task that finishes, before the TimerBoundaryEvent\'s timer expires', async () => {

    const initialToken = {
      interrupt_task: false,
    };

    const expectedResult = /service task not interrupted/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, correlationId, initialToken);

    should(result.currentToken).be.match(expectedResult);
  });

  it('should not interrupt the task when a non-interrupting TimerBoundaryEvent expires', async () => {

    const startEventId2 = 'StartEvent_2';

    await new Promise(async (resolve) => {

      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, resolve);

      const timerExpiredMessageName = '/processengine/process/message/TimerExpiredNotification';
      const onTimerExpiredCallback = async () => {

        const userTaskList = await testFixtureProvider
          .consumerApiClientService
          .getUserTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

        should(userTaskList.userTasks).be.an.Array();
        should(userTaskList.userTasks.length).be.greaterThan(0, 'The UserTask was interrupted!');

        const userTask = userTaskList.userTasks[0];

        await testFixtureProvider
          .consumerApiClientService
          .finishUserTask(defaultIdentity, userTask.processInstanceId, userTask.correlationId, userTask.flowNodeInstanceId, {});
      };

      eventAggregator.subscribeOnce(timerExpiredMessageName, onTimerExpiredCallback);
      testFixtureProvider.executeProcess(processModelId, startEventId2, correlationId);
    });
  });
});
