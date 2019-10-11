'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI:   Receive CronjobRemoved Notification', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let cronjobService;

  let defaultIdentity;

  const processModelId = 'test_management_api_cyclic_timers';

  const cronjobRemovedMessagePath = 'cronjob_removed';
  const sampleCronjobRemovedMessage = {
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

  it('should send a notification when a cronjob is removed', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationSubscription;

      const onCronjobRemovedCallback = async (CronjobRemovedMessage) => {

        should.exist(CronjobRemovedMessage);
        should(CronjobRemovedMessage).have.property('processModelId');
        should(CronjobRemovedMessage).have.property('cronjobs');
        should(CronjobRemovedMessage.processModelId).be.equal(sampleCronjobRemovedMessage.processModelId);

        await testFixtureProvider
          .managementApiClient
          .removeSubscription(defaultIdentity, notificationSubscription);

        resolve();
      };

      notificationSubscription = await testFixtureProvider
        .managementApiClient
        .onCronjobRemoved(defaultIdentity, onCronjobRemovedCallback);

      await cronjobService.start();

      await cronjobService.remove(processModelId);

    });
  });

  it('should no longer receive CronjobRemoved notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClient
      .onCronjobRemoved(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(cronjobRemovedMessagePath, sampleCronjobRemovedMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(cronjobRemovedMessagePath, sampleCronjobRemovedMessage);
    eventAggregator.publish(cronjobRemovedMessagePath, sampleCronjobRemovedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive CronjobRemoved notifications, if subscribeOnce is set to "false"', async () => {

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
        .onCronjobRemoved(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(cronjobRemovedMessagePath, sampleCronjobRemovedMessage);
      eventAggregator.publish(cronjobRemovedMessagePath, sampleCronjobRemovedMessage);
    });
  });

  it('should only receive one CronjobRemoved notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClient
      .onCronjobRemoved(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(cronjobRemovedMessagePath, sampleCronjobRemovedMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(cronjobRemovedMessagePath, sampleCronjobRemovedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

});
