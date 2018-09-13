'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Consumer API GET  ->  /process_models/:process_model_id/correlations/:correlation_id/events', () => {

  let testFixtureProvider;
  let consumerContext;

  const processModelId = 'test_consumer_api_correlation_result';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    consumerContext = testFixtureProvider.context.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a list of events for a given process model in a given correlation', async () => {

    const correlationId = 'correlationId';

    const eventList = await testFixtureProvider
      .consumerApiClientService
      .getEventsForProcessModelInCorrelation(consumerContext, processModelId, correlationId);

    should(eventList).have.property('events');

    should(eventList.events).be.instanceOf(Array);
    should(eventList.events.length).be.greaterThan(0);

    eventList.events.forEach((event) => {
      should(event).have.property('id');
      should(event).have.property('processInstanceId');
      should(event).have.property('data');
    });
  });

  it('should fail to retrieve the correlation\'s events, when the user is unauthorized', async () => {

    const correlationId = 'correlationId';

    try {
      const processModel = await testFixtureProvider
        .consumerApiClientService
        .getEventsForProcessModelInCorrelation({}, processModelId, correlationId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail to retrieve the correlation\'s events, when the user forbidden to retrieve it', async () => {

    const correlationId = 'correlationId';

    const restrictedContext = testFixtureProvider.context.restrictedUser;

    try {
      const processModel = await testFixtureProvider
        .consumerApiClientService
        .getEventsForProcessModelInCorrelation(restrictedContext, processModelId, correlationId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail to retrieve a list of events, if the process_model_id does not exist', async () => {

    const invalidprocessModelId = 'invalidprocessModelId';
    const correlationId = 'correlationId';

    try {
      const processModel = await testFixtureProvider
        .consumerApiClientService
        .getEventsForProcessModelInCorrelation(consumerContext, invalidprocessModelId, correlationId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // TODO: Bad Path not implemented yet
  it.skip('should fail to retrieve a list of events, if the correlation_id does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    try {
      const processModel = await testFixtureProvider
        .consumerApiClientService
        .getEventsForProcessModelInCorrelation(consumerContext, processModelId, invalidCorrelationId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
