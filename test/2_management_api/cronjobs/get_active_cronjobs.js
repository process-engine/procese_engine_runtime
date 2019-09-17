'use strict';

const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetAllActiveCronjobs', () => {

  let cronjobService;
  let testFixtureProvider;

  let defaultIdentity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    cronjobService = await testFixtureProvider.resolveAsync('CronjobService');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const processModelId = 'test_management_api_cyclic_timers';
    const processModelId2 = 'test_management_api_cyclic_timers_2';

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      await cronjobService.start();
    });

    after(async () => {
      await cronjobService.stop();
      await testFixtureProvider.clearDatabases();
    });

    it('should return all active cronjobs', async () => {

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity);

      should(cronjobList.cronjobs).be.an.Array();
      should(cronjobList.cronjobs).have.a.lengthOf(1);

      const cronjob = cronjobList.cronjobs[0];

      should(cronjob.processModelId).be.equal('test_management_api_cyclic_timers');
      should(cronjob.startEventId).be.equal('TimerStartEvent_1');
      should(cronjob.crontab).be.equal('*/2 * * * * *');
    });

    it('should include all cronjobs that are added \'on the fly\'', async () => {

      const parsedProcessModel2 = await getParsedProcessModel(processModelId2);

      await cronjobService.addOrUpdate(parsedProcessModel2);

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity);

      should(cronjobList.cronjobs).be.an.Array();
      should(cronjobList.cronjobs).have.a.lengthOf(2);

      should(cronjobList.cronjobs).matchAny((cronjob) => cronjob.processModelId === processModelId);
      should(cronjobList.cronjobs).matchAny((cronjob) => cronjob.processModelId === processModelId2);
    });

    it('should not include cronjobs that are removed \'on the fly\'', async () => {

      await disposeProcessModel(processModelId2);

      await cronjobService.remove(processModelId2);

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity);

      should(cronjobList.cronjobs).be.an.Array();
      should(cronjobList.cronjobs).have.a.lengthOf(1);
    });

  });

  describe('Pagination', () => {

    // This ProcessModel will create 7 cronjobs
    const processModelIdPaginationTest = 'test_management_api_cronjob_pagination_test';

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelIdPaginationTest]);
      await cronjobService.start();
    });

    after(async () => {
      await cronjobService.stop();
    });

    it('should apply no limit, an offset of 4 and return 3 items', async () => {

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity, 4);

      should(cronjobList.cronjobs).be.an.instanceOf(Array);
      should(cronjobList.cronjobs).have.a.lengthOf(3);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity, 0, 2);

      should(cronjobList.cronjobs).be.an.instanceOf(Array);
      should(cronjobList.cronjobs).have.a.lengthOf(2);
    });

    it('should apply an offset of 3, a limit of 2 and return 2 items', async () => {

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity, 3, 2);

      should(cronjobList.cronjobs).be.an.instanceOf(Array);
      should(cronjobList.cronjobs).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 5 and return 2 items', async () => {

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity, 5, 5);

      should(cronjobList.cronjobs).be.an.instanceOf(Array);
      should(cronjobList.cronjobs).have.a.lengthOf(2);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity, 0, 20);

      should(cronjobList.cronjobs).be.an.instanceOf(Array);
      should(cronjobList.cronjobs).have.a.lengthOf(7);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const cronjobList = await testFixtureProvider
        .managementApiClient
        .getAllActiveCronjobs(defaultIdentity, 1000);

      should(cronjobList.cronjobs).be.an.instanceOf(Array);
      should(cronjobList.cronjobs).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a list of cronjobs, when the user is unauthorized', async () => {
      try {
        const cronjobList = await testFixtureProvider
          .managementApiClient
          .getAllActiveCronjobs({});

        should.fail(cronjobList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });

  async function getParsedProcessModel(processModelId) {
    await testFixtureProvider.importProcessFiles([processModelId]);

    return testFixtureProvider.processModelUseCases.getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);
  }

  async function disposeProcessModel(processModelId) {
    await testFixtureProvider
      .processModelUseCases
      .deleteProcessModel(testFixtureProvider.identities.defaultUser, processModelId);
  }

});
