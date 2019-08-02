'use strict';

const moment = require('moment');
const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   GET  ->  /cronjobs/history/process_model/:process_model_id?start_event_id=<id>', () => {

  let cronjobHistoryRepository;
  let testFixtureProvider;

  let defaultIdentity;
  let superAdmin;
  let restrictedIdentity;

  const processModelId = 'dummy_process_model_id_1';
  const processModelId2 = 'dummy_process_model_id_2';

  const fixtures = [{
    processModelId: processModelId,
    startEventId: 'TimerStartEvent_1',
    crontab: '* * 1 1 1',
    executedAt: moment().subtract(10, 'minutes').toDate(),
  }, {
    processModelId: processModelId,
    startEventId: 'TimerStartEvent_2',
    crontab: '* * 2 2 2',
    executedAt: moment().subtract(20, 'minutes').toDate(),
  }, {
    processModelId: processModelId2,
    startEventId: 'TimerStartEvent_1',
    crontab: '* * 3 3 3',
    executedAt: moment().subtract(5, 'minutes').toDate(),
  }, {
    processModelId: processModelId2,
    startEventId: 'TimerStartEvent_2',
    crontab: '* * 4 4 4',
    executedAt: moment().subtract(25, 'minutes').toDate(),
  }];

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    superAdmin = testFixtureProvider.identities.superAdmin;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    cronjobHistoryRepository = await testFixtureProvider.resolveAsync('CronjobHistoryRepository');

    await addFixtures();
  });

  after(async () => {
    await removeFixtures();
    await testFixtureProvider.tearDown();
  });

  it('should return the cronjob history for the given ProcessModelId, when the user has the required claim', async () => {
    const cronjobHistory = await testFixtureProvider
      .managementApiClient
      .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId);

    should(cronjobHistory).have.length(2);

    assertCronjobHistory(cronjobHistory, processModelId);
  });

  it('should return the cronjob history for the given ProcessModelId, when the user is a super admin', async () => {
    const cronjobHistory = await testFixtureProvider
      .managementApiClient
      .getCronjobExecutionHistoryForProcessModel(superAdmin, processModelId);

    should(cronjobHistory).have.length(2);

    assertCronjobHistory(cronjobHistory, processModelId);
  });

  it('should return the cronjob history for the given ProcessModelId and StartEventId', async () => {
    const startEventId = 'TimerStartEvent_2';

    const cronjobHistory = await testFixtureProvider
      .managementApiClient
      .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId);

    should(cronjobHistory).have.length(1);

    assertCronjobHistory(cronjobHistory, processModelId, startEventId);
  });

  it('should fail to retrieve a list of cronjobs, when the user is unauthorized', async () => {
    try {
      const results = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel({});

      should.fail(results, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve a list of cronjobs, when the user is forbidden to do so', async () => {
    try {
      const results = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(restrictedIdentity, processModelId);

      should.fail(results, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  function assertCronjobHistory(cronjobHistoryList, expectedProcessModelId, expectedStartEventId) {

    for (const cronjob of cronjobHistoryList) {
      should(cronjob.processModelId).be.equal(expectedProcessModelId);
      should(cronjob).have.property('startEventId');
      should(cronjob).have.property('crontab');
      should(cronjob).have.property('executedAt');

      if (expectedStartEventId) {
        should(cronjob.startEventId).be.equal(expectedStartEventId);
      }
    }
  }

  async function addFixtures() {
    for (const fixture of fixtures) {
      await cronjobHistoryRepository.create(fixture);
    }
  }

  async function removeFixtures() {
    await cronjobHistoryRepository.sequelizeInstance.models.CronjobHistory.destroy({
      where: {
        processModelId: processModelId,
      },
    });

    await cronjobHistoryRepository.sequelizeInstance.models.CronjobHistory.destroy({
      where: {
        processModelId: processModelId2,
      },
    });
  }

});
