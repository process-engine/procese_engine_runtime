'use strict';

const moment = require('moment');
const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetCronjobExecutionHistoryForProcessModel', () => {

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
      crontab: '* * 3 3 3',
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
    });

    it('should return the cronjob history for the given ProcessModelId, when the user has the required claim', async () => {
      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId);

      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(2);

      assertCronjobHistory(cronjobHistoryList.cronjobHistories, processModelId);
    });

    it('should return the cronjob history for the given ProcessModelId, when the user is a super admin', async () => {
      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(superAdmin, processModelId);

      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(2);

      assertCronjobHistory(cronjobHistoryList.cronjobHistories, processModelId);
    });

    it('should return the cronjob history for the given ProcessModelId and StartEventId', async () => {
      const startEventId = 'TimerStartEvent_2';

      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId);

      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(1);

      assertCronjobHistory(cronjobHistoryList.cronjobHistories, processModelId, startEventId);
    });
  });

  describe('Pagination', () => {

    const processModelId = 'dummy_process_model_id_1';
    const crontab = '* * 1 1 1';
    const startEventId = 'TimerStartEvent_1';

    const fixtures = [{
      processModelId: processModelId,
      startEventId: startEventId,
      crontab: crontab,
      executedAt: moment().subtract(10, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: startEventId,
      crontab: crontab,
      executedAt: moment().subtract(20, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: startEventId,
      crontab: crontab,
      executedAt: moment().subtract(5, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: startEventId,
      crontab: crontab,
      executedAt: moment().subtract(12, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: startEventId,
      crontab: crontab,
      executedAt: moment().subtract(25, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: startEventId,
      crontab: crontab,
      executedAt: moment().subtract(35, 'minutes')
        .toDate(),
    }, {
      processModelId: processModelId,
      startEventId: startEventId,
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

      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId, 4);

      should(cronjobHistoryList.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(3);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId, 0, 2);

      should(cronjobHistoryList.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(2);
    });

    it('should apply an offset of 3, a limit of 2 and return 2 items', async () => {

      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId, 3, 2);

      should(cronjobHistoryList.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 5 and return 2 items', async () => {

      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId, 5, 5);

      should(cronjobHistoryList.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(2);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId, 0, 20);

      should(cronjobHistoryList.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(7);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const cronjobHistoryList = await testFixtureProvider
        .managementApiClient
        .getCronjobExecutionHistoryForProcessModel(defaultIdentity, processModelId, startEventId, 1000);

      should(cronjobHistoryList.cronjobHistories).be.an.instanceOf(Array);
      should(cronjobHistoryList.cronjobHistories).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

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
          .getCronjobExecutionHistoryForProcessModel(restrictedIdentity, 'processModelId');

        should.fail(results, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /access denied/i;
        const expectedErrorCode = 403;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
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
