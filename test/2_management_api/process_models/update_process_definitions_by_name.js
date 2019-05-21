'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

// NOTE:
// The deployment api alrady contains extensive testing for this, so there is no need to cover everything here.
// We just need to ensure that all commands get passed correctly to the deployment api and leave the rest up to it.
describe('ManagementAPI:   POST  ->  /process_models/:process_model_id/update', () => {

  let testFixtureProvider;

  const processModelId = 'generic_sample';
  let processModelAsXml;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    processModelAsXml = testFixtureProvider.readProcessModelFile(processModelId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully import the ProcessDefinition, if the user has the required claim to do so', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    await testFixtureProvider
      .managementApiClientService
      .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelId, importPayload);

    await assertThatImportWasSuccessful();
  });

  it('should successfully import the ProcessDefinition, if the requesting user is a SuperAdmin', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    await testFixtureProvider
      .managementApiClientService
      .updateProcessDefinitionsByName(testFixtureProvider.identities.superAdmin, processModelId, importPayload);

    await assertThatImportWasSuccessful();
  });

  it('should fail to deploy the ProcessDefinition, if it already exists and "overwriteExisting" is set to false', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: false,
    };

    try {
      await testFixtureProvider
        .managementApiClientService
        .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelId, importPayload);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /already exists/i;
      const expectedErrorCode = 409;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to deploy the ProcessModel, when the user is unauthorized', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .updateProcessDefinitionsByName({}, processModelId, importPayload);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to deploy the ProcessModel, if the User does not have the required claim', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .updateProcessDefinitionsByName(testFixtureProvider.identities.restrictedUser, processModelId, importPayload);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  async function assertThatImportWasSuccessful() {

    const processModelService = await testFixtureProvider.resolveAsync('ProcessModelService');

    const existingProcessModel = await processModelService
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
  }

});
