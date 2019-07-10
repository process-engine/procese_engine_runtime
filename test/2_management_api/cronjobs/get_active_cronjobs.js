'use strict';

const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   GET  ->  /cronjobs/active', () => {

  let cronjobService;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_cyclic_timers';
  const processModelId2 = 'test_management_api_cyclic_timers_2';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    cronjobService = await testFixtureProvider.resolveAsync('CronjobService');
    await cronjobService.start();
  });

  after(async () => {
    await cronjobService.stop();
    await disposeProcessModel(processModelId);
    await testFixtureProvider.tearDown();
  });

  it('should return all active cronjobs', async () => {

    const cronjobs = await testFixtureProvider
      .managementApiClientService
      .getAllActiveCronjobs(defaultIdentity);

    should(cronjobs).be.an.Array();
    should(cronjobs).have.length(1);

    const cronjob = cronjobs[0];

    should(cronjob.processModelId).be.equal('test_management_api_cyclic_timers');
    should(cronjob.startEventId).be.equal('TimerStartEvent_1');
    should(cronjob.crontab).be.equal('*/15 1 * * *');
  });

  it('should include all cronjobs that are added \'on the fly\'', async () => {

    const parsedProcessModel2 = await getParsedProcessModel(processModelId2);

    await cronjobService.addOrUpdate(parsedProcessModel2);

    const cronjobs = await testFixtureProvider
      .managementApiClientService
      .getAllActiveCronjobs(defaultIdentity);

    should(cronjobs).be.an.Array();
    should(cronjobs).have.length(2);

    should(cronjobs).matchAny((cronjob) => cronjob.processModelId === processModelId);
    should(cronjobs).matchAny((cronjob) => cronjob.processModelId === processModelId2);
  });

  it('should not include cronjobs that are removed \'on the fly\'', async () => {

    await disposeProcessModel(processModelId2);

    await cronjobService.remove(processModelId2);

    const cronjobs = await testFixtureProvider
      .managementApiClientService
      .getAllActiveCronjobs(defaultIdentity);

    should(cronjobs).be.an.Array();
    should(cronjobs).have.length(1);
  });

  it('should fail to retrieve a list of cronjobs, when the user is unauthorized', async () => {
    try {
      const cronjobs = await testFixtureProvider
        .managementApiClientService
        .getAllActiveCronjobs({});

      should.fail(cronjobs, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
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
