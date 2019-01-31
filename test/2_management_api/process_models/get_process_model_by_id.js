'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API:   GET  ->  /process_models/:process_model_id', () => {

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

  it('should return a process model by its process_model_id through the management api', async () => {

    const processModel = await testFixtureProvider
      .managementApiClientService
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should(processModel).have.property('id');
    should(processModel).have.property('xml');
    should(processModel).have.property('startEvents');
    should(processModel).have.property('endEvents');
    should(processModel.startEvents.length).be.greaterThan(0);
    should(processModel.endEvents.length).be.greaterThan(0);
  });

  it('should fail to retrieve the process model, when the user is unauthorized', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .getProcessModelById({}, processModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the process model, if the process_model_id does not exist', async () => {

    const invalidProcessModelId = 'invalidProcessModelId';

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .getProcessModelById(testFixtureProvider.identities.defaultUser, invalidProcessModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
