'use strict';

const moment = require('moment');
const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Intermediate Events - ', () => {

  let testFixtureProvider;

  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    const processDefFileList = [
      'intermediate_event_message_test',
      'intermediate_event_signal_test',
      'intermediate_event_timer_test',
    ];

    await testFixtureProvider.importProcessFiles(processDefFileList);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should throw and receive a message', async () => {

    const processModelId = 'intermediate_event_message_test';

    const expectedResult = /message received/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);

    should(result).have.property('tokenPayload');
    should(result.tokenPayload).be.match(expectedResult);
  });

  it('should throw and receive a signal', async () => {

    const processModelId = 'intermediate_event_signal_test';

    const expectedResult = /signal received/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);

    should(result).have.property('tokenPayload');
    should(result.tokenPayload).be.match(expectedResult);
  });

  it('Should pause execution for 5 seconds by use of a timer catch event and then resume the process.', async () => {

    const processModelId = 'intermediate_event_timer_test';

    const timeStampBeforeStart = moment();

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);

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
    const expectedTimerRuntime = 5;

    should(result).have.property('tokenPayload');
    should(result.tokenPayload).be.match(expectedResult);
    should(duration).be.greaterThan(expectedTimerRuntime);
  });

});
