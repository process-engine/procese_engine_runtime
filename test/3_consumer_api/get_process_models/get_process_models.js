'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ConsumerAPI: GetProcessModels', () => {

  let testFixtureProvider;
  let defaultIdentity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    before(async () => {
      const processModelsToImport = [
        'test_consumer_api_process_start',
        'test_consumer_api_non_executable_process',
      ];

      await testFixtureProvider.importProcessFiles(processModelsToImport);
    });

    after(async () => {
      await testFixtureProvider.clearDatabases();
    });

    it('should return process models through the consumer api', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);
      should(processModelList.processModels.length).be.greaterThan(0);

      processModelList.processModels.forEach((processModel) => {
        should(processModel).have.property('id');
        should(processModel).have.property('startEvents');
        should(processModel).have.property('endEvents');
        should(processModel.startEvents).be.an.instanceOf(Array);
        should(processModel.endEvents).be.an.instanceOf(Array);
      });
    });

    it('should filter out processes models that the user is not authorized to see', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(restrictedIdentity);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);

      processModelList.processModels.forEach((processModel) => {
        should(processModel).have.property('id');
        should(processModel.id).not.be.equal('test_consumer_api_process_start');
        should(processModel).have.property('startEvents');
        should(processModel).have.property('endEvents');
        should(processModel.startEvents).be.an.instanceOf(Array);
        should(processModel.endEvents).be.an.instanceOf(Array);
      });
    });

    it('should not return any start events for processes which are not marked as executable', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);

      processModelList.processModels.forEach((processModel) => {
        should(processModel).have.property('id');
        should(processModel).have.property('startEvents');
        should(processModel).have.property('endEvents');
        should(processModel.startEvents).be.an.instanceOf(Array);
        should(processModel.endEvents).be.an.instanceOf(Array);

        if (processModel.id === 'test_consumer_api_non_executable_process') {
          should(processModel.startEvents).have.a.lengthOf(0);
          should(processModel.endEvents).have.a.lengthOf(0);
        }
      });
    });
  });

  describe('Pagination', () => {

    before(async () => {
      const processModelsToImport = [
        'test_consumer_api_boundaryevent',
        'test_consumer_api_callactivity_target',
        'test_consumer_api_callactivity',
        'test_consumer_api_correlation_multiple_results',
        'test_consumer_api_correlation_result',
        'test_consumer_api_emptyactivity_call_activity',
        'test_consumer_api_emptyactivity_empty',
        'test_consumer_api_emptyactivity',
        'test_consumer_api_process_start',
        'test_consumer_api_non_executable_process',
      ];

      await testFixtureProvider.importProcessFiles(processModelsToImport);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity, 5);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);
      should(processModelList.processModels).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity, 0, 2);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);
      should(processModelList.processModels).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity, 5, 2);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);
      should(processModelList.processModels).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity, 7, 5);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);
      should(processModelList.processModels).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity, 0, 20);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);
      should(processModelList.processModels).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const processModelList = await testFixtureProvider
        .consumerApiClient
        .getProcessModels(defaultIdentity, 1000);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.instanceOf(Array);
      should(processModelList.processModels).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a list of process models, when the user is unauthorized', async () => {
      try {
        const processModelList = await testFixtureProvider
          .consumerApiClient
          .getProcessModels({});

        should.fail(processModelList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 401;
        const expectedErrorMessage = /no auth token provided/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });
  });

});
