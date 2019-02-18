'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Timer Event validation - ', () => {

  let testFixtureProvider;

  const processModelIdDuration = 'timer_invalid_duration';
  const processModelIdDate = 'timer_invalid_date';
  const processModelIdCyclic = 'timer_cyclic';
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelIdDuration, processModelIdDate, processModelIdCyclic]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should throw an error if attempting to execute a timer with an invalid date.', async () => {
    try {
      const result = await testFixtureProvider.executeProcess(processModelIdDate, startEventId);
      should.fail(result, 'error', 'This should have failed because of an invalid date definition!');
    } catch (error) {
      const expectedErrorMessage = /given date.*?not in ISO8601 format/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should throw an error if attempting to execute a timer with an invalid duration.', async () => {
    try {
      const result = await testFixtureProvider.executeProcess(processModelIdDuration, startEventId);
      should.fail(result, 'error', 'This should have failed because of an invalid duration definition!');
    } catch (error) {
      const expectedErrorMessage = /given duration.*?not in ISO8601 format/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should throw an error if attempting to execute a timer with a cyclic timer definition.', async () => {
    try {
      const result = await testFixtureProvider.executeProcess(processModelIdCyclic, startEventId);
      should.fail(result, 'error', 'This should have failed because of the use of unsupported cyclic timers!');
    } catch (error) {
      const expectedErrorMessage = /not supported/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });
});
