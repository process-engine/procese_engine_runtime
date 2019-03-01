'use strict';

const moment = require('moment');
const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Intermediate Events - ', () => {

  let testFixtureProvider;

  const processModelIdEmptyTest = 'intermediate_empty_event_test';
  const processModelIdLinkTest = 'intermediate_event_link_test';
  const processModelIdTimerTest = 'intermediate_event_timer_test';
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelIdEmptyTest, processModelIdLinkTest, processModelIdTimerTest]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it.only('Should successfully run a ProcessModel that contains an empty event.', async () => {

    const result = await testFixtureProvider.executeProcess(processModelIdEmptyTest, startEventId);

    const expectedResult = /sample result/i;

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('Should successfully move to a linked IntermediateLinkCatchEvent, after a corresponding IntermediateLinkThrowEvent was reached.', async () => {

    const result = await testFixtureProvider.executeProcess(processModelIdLinkTest, startEventId);

    const expectedResult = /followed link 1/i;

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('Should throw an error, if a IntermediateLinkThrowEvent attempts to jump to a non existing IntermediateLinkCatchEvent.', async () => {

    try {
      const startEventForInvalidLinkTest = 'StartEvent_666';
      const result = await testFixtureProvider.executeProcess(processModelIdLinkTest, startEventForInvalidLinkTest);

      should.fail(result, undefined, 'This should have failed, because the referenced link does not exist!');
    } catch (error) {
      const expectedMessage = /No IntermediateCatchEvent.*?exists/i;
      const expectedCode = 404;
      should(error.message).be.match(expectedMessage);
      should(error.code).be.match(expectedCode);
    }
  });

  it('Should throw an error, if multiple CatchEvents for the same link exist.', async () => {

    try {
      const startEventForInvalidLinkTest = 'StartEvent_2';
      const result = await testFixtureProvider.executeProcess(processModelIdLinkTest, startEventForInvalidLinkTest);

      should.fail(result, undefined, 'This should have failed, because the referenced link is not unique!');
    } catch (error) {
      const expectedMessage = /too many/i;
      const expectedCode = 400;
      should(error.message).be.match(expectedMessage);
      should(error.code).be.match(expectedCode);
    }
  });

  it('Should pause execution for 2 seconds by use of a timer catch event and then resume the process.', async () => {

    const timeStampBeforeStart = moment();
    const result = await testFixtureProvider.executeProcess(processModelIdTimerTest, startEventId);
    const timeStampAfterFinish = moment();

    // Note that this is not exact,
    // since this time span equals the total process execution time and not just the duration of the timer.
    // This means that we can't perform an exact match here. We can only see, if the process execution was
    // delayed by at least the amount of time that the timer was supposed to last.
    const runtimeRaw = timeStampAfterFinish.diff(timeStampBeforeStart);
    const duration = moment
      .duration(runtimeRaw)
      .asSeconds();

    const expectedResult = /timer event.*?lapsed/i;
    const expectedTimerRuntime = 2;

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
    should(duration).be.greaterThan(expectedTimerRuntime);
  });

});
