'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').FixtureProviderProcessEngine;

describe.skip('Signal Boundary Event - ', () => {

  let testFixtureProvider;

  const processModelId = 'boundary_event_signal_test';
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should interrupt the running service task when a signal arrives', async () => {

    const expectedToken = {
      history: {
        StartEvent_1: {},
        Task1: 1,
        ParallelSplit1: 1,
        TimerEvent1: 1,
        ThrowEvent1: 1,
        Task3: 1,
        SignalBoundaryEvent1: 1,
        Task4: 2,
        XORJoin1: 2,
        ParallelJoin1: 2,
      },
    };

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);

    should(result.tokenPayload).be.eql(expectedToken);
  });
});
