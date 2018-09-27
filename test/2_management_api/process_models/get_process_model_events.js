'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Management API:   GET  ->  /process_models/:process_model_id/events', () => {

  let testFixtureProvider;

  const processModelId = 'generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a process model\'s events by its process_model_id through the management api', async () => {

    const processModel = await testFixtureProvider
      .managementApiClientService
      .getEventsForProcessModel(testFixtureProvider.identities.defaultUser, processModelId);

    should(processModel).have.property('events');
    should(processModel.events).be.instanceof(Array);
    should(processModel.events.length).be.greaterThan(0);

    for (const event of processModel.events) {
      should(event).have.property('id');
    }
  });

});
