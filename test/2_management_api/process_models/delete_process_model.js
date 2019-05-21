'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI:   GET  ->  /process_models/:process_model_id/delete', () => {

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

  it('should allow the user to delete a ProcessModel by its ID through the ManagementAPI, if he has the required claim', async () => {

    await testFixtureProvider
      .managementApiClientService
      .deleteProcessDefinitionsByProcessModelId(testFixtureProvider.identities.defaultUser, processModelId);
  });

  it('should allow the user to delete a ProcessModel by its ID through the ManagementAPI, if he has the SuperAdmin claim', async () => {

    await testFixtureProvider
      .managementApiClientService
      .deleteProcessDefinitionsByProcessModelId(testFixtureProvider.identities.superAdmin, processModelId);
  });

  it('should fail to retrieve the ProcessModel, after its been deleted', async () => {
    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to delete the ProcessModel, when the user is unauthorized', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .deleteProcessDefinitionsByProcessModelId({}, processModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to delete the ProcessModel, when the user is forbidden to do so', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .deleteProcessDefinitionsByProcessModelId(testFixtureProvider.identities.restrictedUser, processModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });
});
