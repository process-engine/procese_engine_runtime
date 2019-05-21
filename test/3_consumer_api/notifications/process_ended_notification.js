'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   Receive ProcessEnded Notification', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const correlationId = uuid.v4();
  const processModelId = 'test_consumer_api_process_start';

  const noopCallback = () => {};

  const processEndedMessagePath = 'process_ended';
  const sampleProcessEndedMessage = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'End_Event_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleProcessEndedMessage.processInstanceOwner = defaultIdentity;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a process is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationSubscription;

      const onProcessEndCallback = async (processEndedMessage) => {

        if (processEndedMessage.correlationId !== correlationId) {
          return;
        }

        const expectedEndEventId = 'EndEvent_Success';

        should.exist(processEndedMessage);
        should(processEndedMessage).have.property('correlationId');
        should(processEndedMessage.correlationId).be.equal(correlationId);
        should(processEndedMessage).have.property('flowNodeId');
        should(processEndedMessage.flowNodeId).be.equal(expectedEndEventId);

        await testFixtureProvider
          .consumerApiClientService
          .removeSubscription(defaultIdentity, notificationSubscription);

        resolve();
      };

      notificationSubscription = await testFixtureProvider
        .consumerApiClientService
        .onProcessEnded(defaultIdentity, onProcessEndCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should fail to subscribe for the ProcessEnded notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onProcessEnded({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should no longer receive ProcessEnded notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClientService
      .onProcessEnded(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(processEndedMessagePath, sampleProcessEndedMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .consumerApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(processEndedMessagePath, sampleProcessEndedMessage);
    eventAggregator.publish(processEndedMessagePath, sampleProcessEndedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive ProcessEnded notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .consumerApiClientService
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onProcessEnded(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(processEndedMessagePath, sampleProcessEndedMessage);
      eventAggregator.publish(processEndedMessagePath, sampleProcessEndedMessage);
    });
  });

  it('should only receive one ProcessEnded notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClientService
      .onProcessEnded(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(processEndedMessagePath, sampleProcessEndedMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(processEndedMessagePath, sampleProcessEndedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });
});
