'use strict';

const moment = require('moment');
const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI: GetCronjobExecutionHistoryForCrontab', () => {

  let cronjobHistoryRepository;
  let testFixtureProvider;

  let defaultIdentity;
  let superAdmin;
  let restrictedIdentity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    superAdmin = testFixtureProvider.identities.superAdmin;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    cronjobHistoryRepository = await testFixtureProvider.resolveAsync('CronjobHistoryRepository');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const processModelId = 'dummy_process_model_id_1';
    const processModelId2 = 'dummy_process_model_id_2';

    const fixtures = [{
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: '* * 1 1 1',
      executedAt: moment().subtract(10, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_2',
      crontab: '* * 2 2 2',
      executedAt: moment().subtract(20, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId2,
      startEventId: 'TimerStartEvent_1',
      crontab: '* * 1 1 1',
      executedAt: moment().subtract(5, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId2,
      startEventId: 'TimerStartEvent_2',
      crontab: '* * 4 4 4',
      executedAt: moment().subtract(25, 'minutes')
        .toDate(),
    }];

    before(async () => {
      await addFixtures(fixtures);
    });

    after(async () => {
      await removeFixtures(processModelId);
      await removeFixtures(processModelId2);
    });

    it('should return the cronjob history for the given Crontab, when the user has the required claim', async () => {
      const crontab = '* * 1 1 1';

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(defaultIdentity, crontab);

      should(cronjobHistory.cronjobHistories).have.a.lengthOf(2);

      assertCronjobHistory(cronjobHistory.cronjobHistories, crontab);
    });

    it('should return the cronjob history for the given Crontab, when the user is a super admin', async () => {
      const crontab = '* * 1 1 1';

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(superAdmin, crontab);

      should(cronjobHistory.cronjobHistories).have.a.lengthOf(2);

      assertCronjobHistory(cronjobHistory.cronjobHistories, crontab);
    });
  });

  describe('Pagination', () => {

    const processModelId = 'dummy_process_model_id_1';
    const crontab = '* * 1 1 1';

    const fixtures = [{
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: crontab,
      executedAt: moment().subtract(10, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: crontab,
      executedAt: moment().subtract(20, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: crontab,
      executedAt: moment().subtract(5, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: crontab,
      executedAt: moment().subtract(12, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: crontab,
      executedAt: moment().subtract(25, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: crontab,
      executedAt: moment().subtract(35, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: 'TimerStartEvent_1',
      crontab: crontab,
      executedAt: moment().subtract(45, 'minutes')
        .toDate(),
    }];

    before(async () => {
      await addFixtures(fixtures);
    });

    after(async () => {
      await removeFixtures(processModelId);
    });

    it('should apply no limit, an offset of 4 and return 3 items', async () => {

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(defaultIdentity, crontab, 4);

      should(cronjobHistory.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistory.cronjobHistories).have.a.lengthOf(3);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(defaultIdentity, crontab, 0, 2);

      should(cronjobHistory.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistory.cronjobHistories).have.a.lengthOf(2);
    });

    it('should apply an offset of 3, a limit of 2 and return 2 items', async () => {

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(defaultIdentity, crontab, 3, 2);

      should(cronjobHistory.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistory.cronjobHistories).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 5 and return 2 items', async () => {

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(defaultIdentity, crontab, 5, 5);

      should(cronjobHistory.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistory.cronjobHistories).have.a.lengthOf(2);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(defaultIdentity, crontab, 0, 20);

      should(cronjobHistory.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistory.cronjobHistories).have.a.lengthOf(7);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const cronjobHistory = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForCrontab(defaultIdentity, crontab, 1000);

      should(cronjobHistory.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistory.cronjobHistories).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a list of cronjobs, when the user is unauthorized', async () => {
      try {
        const results = await testFixtureProvider
          .managementApiClient
          .getCronjobExecutionHistoryForCrontab({});

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
          .getCronjobExecutionHistoryForCrontab(restrictedIdentity, 'processModelId');

        should.fail(results, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /access denied/i;
        const expectedErrorCode = 403;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });

  function assertCronjobHistory(cronjobHistoryList, expectedCrontab) {

    for (const cronjob of cronjobHistoryList) {
      should(cronjob.crontab).be.equal(expectedCrontab);
      should(cronjob).have.property('processModelId');
      should(cronjob).have.property('startEventId');
      should(cronjob).have.property('executedAt');
    }
  }

  async function addFixtures(fixtures) {
    for (const fixture of fixtures) {
      await cronjobHistoryRepository.create(fixture);
    }
  }

  async function removeFixtures(processModelId) {
    await cronjobHistoryRepository.sequelizeInstance.models.CronjobHistory.destroy({
      where: {
        processModelId: processModelId,
      },
    });
  }

});
