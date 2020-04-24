'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI: GetProcessModels', () => {

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
        'test_management_api_process_start',
        'test_management_api_correlation_error',
      ];

      await testFixtureProvider.importProcessFiles(processModelsToImport);
    });

    after(async () => {
      await testFixtureProvider.clearDatabases();
    });

    it('should return process models through the ManagementAPI', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();
      should(processModelList.processModels.length).be.greaterThan(0);

      processModelList.processModels.forEach((processModel) => {
        should(processModel).have.property('id');
        should(processModel).have.property('startEvents');
        should(processModel).have.property('endEvents');
        should(processModel.startEvents).be.an.Array();
        should(processModel.endEvents).be.an.Array();
      });
    });

    it('should filter out processes models that the user is not authorized to see', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(restrictedIdentity);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();

      processModelList.processModels.forEach((processModel) => {
        should(processModel).have.property('id');
        should(processModel.id).not.be.equal('test_management_api_process_start');
        should(processModel).have.property('startEvents');
        should(processModel).have.property('endEvents');
        should(processModel.startEvents).be.an.Array();
        should(processModel.endEvents).be.an.Array();
      });
    });

    it('should not return any start events for processes which are not marked as executable', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();

      processModelList.processModels.forEach((processModel) => {
        should(processModel).have.property('id');
        should(processModel).have.property('startEvents');
        should(processModel).have.property('endEvents');
        should(processModel.startEvents).be.an.Array();
        should(processModel.endEvents).be.an.Array();

        if (processModel.id === 'test_management_api_non_executable_process') {
          should(processModel.startEvents).be.empty();
          should(processModel.endEvents).be.empty();
        }
      });
    });
  });

  describe('Pagination', () => {

    before(async () => {
      const processModelsToImport = [
        'test_management_api_boundaryevent',
        'test_management_api_callactivity_target',
        'test_management_api_callactivity',
        'test_management_api_manualtask',
        'test_management_api_message_event',
        'test_management_api_emptyactivity_call_activity',
        'test_management_api_emptyactivity_empty',
        'test_management_api_emptyactivity',
        'test_management_api_process_start',
        'test_management_api_process_terminate',
      ];

      await testFixtureProvider.importProcessFiles(processModelsToImport);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity, 5);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();
      should(processModelList.processModels).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity, 0, 2);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();
      should(processModelList.processModels).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity, 5, 2);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();
      should(processModelList.processModels).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity, 7, 5);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();
      should(processModelList.processModels).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity, 0, 20);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();
      should(processModelList.processModels).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const processModelList = await testFixtureProvider
        .managementApiClient
        .getProcessModels(defaultIdentity, 1000);

      should(processModelList).have.property('processModels');

      should(processModelList.processModels).be.an.Array();
      should(processModelList.processModels).be.empty();
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a list of process models, when the user is unauthorized', async () => {
      try {
        const processModelList = await testFixtureProvider
          .managementApiClient
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
