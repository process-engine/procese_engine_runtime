'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetWaitingEventsForProcessModel', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_signal_event';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    before(async () => {
      const correlationId = uuid.v4();
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    after(async () => {
      // The events must be cleaned up here, so they won't interfere with the pagination tests.
      const signalEventName = 'test_signal_event';

      await testFixtureProvider
        .managementApiClient
        .triggerSignalEvent(testFixtureProvider.identities.superAdmin, signalEventName, {});

      // Wait a little until the event was cleared
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should return a process models events by its process_model_id through the Management API', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, processModelId);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events.length).be.greaterThan(0);

      eventList.events.forEach((event) => {
        should(event).have.property('id');
        should(event).have.property('processInstanceId');
        should(event).have.property('flowNodeInstanceId');
        should(event).have.property('correlationId');
        should(event).have.property('processModelId');
        should(event).have.property('bpmnType');
        should(event).have.property('eventType');
        should(event).have.property('eventName');
      });
    });

    it('should return an empty Array, if the process_model_id does not exist', async () => {

      const invalidprocessModelId = 'invalidprocessModelId';

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, invalidprocessModelId);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(0);
    });
  });

  describe('Pagination', () => {

    before(async () => {
      const correlationIdPaginationTest = uuid.v4();
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 Events after this.
      for (let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, processModelId, 5);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, processModelId, 0, 2);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, processModelId, 5, 2);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, processModelId, 7, 5);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, processModelId, 0, 20);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModel(defaultIdentity, processModelId, 1000);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve the process model\'s events, when the user is unauthorized', async () => {

      const processModelId = 'test_get_events_for_process_model';

      try {
        await testFixtureProvider
          .managementApiClient
          .getWaitingEventsForProcessModel({}, processModelId);

        should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 401;
        const expectedErrorMessage = /no auth token provided/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });

    it('should fail to retrieve the process model\'s events, when the user forbidden to retrieve it', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

      try {
        await testFixtureProvider
          .managementApiClient
          .getWaitingEventsForProcessModel(restrictedIdentity, processModelId);

        should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 403;
        const expectedErrorMessage = /access denied/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });
  });
});
