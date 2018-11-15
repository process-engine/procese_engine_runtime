'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Management API:   GET  ->  /process_models/:process_model_id/delete', () => {

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

  it('should fail to delete the process model, when the user is unauthorized', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .deleteProcessDefinitionsByProcessModelId({}, processModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should delete the process model by its process_model_id through the management api', async () => {

    await testFixtureProvider
      .managementApiClientService
      .deleteProcessDefinitionsByProcessModelId(testFixtureProvider.identities.defaultUser, processModelId);
  });

  it('should fail to retrieve the process model, after its been deleted', async () => {
    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });
});
