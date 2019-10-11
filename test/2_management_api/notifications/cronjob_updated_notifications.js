'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI:   Receive CronjobUpdated Notification', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let cronjobService;

  let defaultIdentity;

  const processModelId = 'test_management_api_cyclic_timers';

  const cronjobUpdatedMessagePath = 'cronjob_updated';
  const sampleCronjobUpdatedMessage = {
    processModelId: processModelId,
    cronjobs: [
      {
        subscription: {
          eventName: 'TimerStartEvent_1_d2263515-0fca-4ea3-a4df-05fba899de99',
          id: '05722c48-4ffa-4022-8f3d-c8bdd966e06e',
          onlyReceiveOnce: false,
        },
        startEventId: 'TimerStartEvent_1',
        cronjob: '*/15 1 * * *',
      },
    ],
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    cronjobService = await testFixtureProvider.resolveAsync('CronjobService');
  });

  after(async () => {
    await cronjobService.stop();
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a cronjob is updated', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationSubscription;

      const onCronjobUpdatedCallback = async (cronjobUpdatedMessage) => {

        should.exist(cronjobUpdatedMessage);
        should(cronjobUpdatedMessage).have.property('processModelId');
        should(cronjobUpdatedMessage).have.property('cronjobs');
        should(cronjobUpdatedMessage.processModelId).be.equal(sampleCronjobUpdatedMessage.processModelId);

        await testFixtureProvider
          .managementApiClient
          .removeSubscription(defaultIdentity, notificationSubscription);

        resolve();
      };

      notificationSubscription = await testFixtureProvider
        .managementApiClient
        .onCronjobUpdated(defaultIdentity, onCronjobUpdatedCallback);

      await cronjobService.start();

      const parsedProcessModel = await getParsedProcessModel(processModelId);

      await cronjobService.addOrUpdate(parsedProcessModel);

    });
  });

  it('should no longer receive CronjobUpdated notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClient
      .onCronjobUpdated(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(cronjobUpdatedMessagePath, sampleCronjobUpdatedMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(cronjobUpdatedMessagePath, sampleCronjobUpdatedMessage);
    eventAggregator.publish(cronjobUpdatedMessagePath, sampleCronjobUpdatedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive CronjobUpdated notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .managementApiClient
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .managementApiClient
        .onCronjobUpdated(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(cronjobUpdatedMessagePath, sampleCronjobUpdatedMessage);
      eventAggregator.publish(cronjobUpdatedMessagePath, sampleCronjobUpdatedMessage);
    });
  });

  it('should only receive one CronjobUpdated notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClient
      .onCronjobUpdated(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(cronjobUpdatedMessagePath, sampleCronjobUpdatedMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(cronjobUpdatedMessagePath, sampleCronjobUpdatedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  async function getParsedProcessModel(processModelId) {
    return testFixtureProvider.processModelUseCases.getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);
  }

});
