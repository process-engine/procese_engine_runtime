'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API:   POST  ->  /process_models/:process_model_id/update', () => {

  let testFixtureProvider;

  const processModelId = 'test_management_api_generic_sample';
  const processModelIdNoLanes = 'process_model_without_lanes';
  const processModelIdNameMismatch = 'process_model_name_mismatch';
  const processModelIdTooManyProcesses = 'process_model_too_many_processes';

  let processModelAsXml;
  let processModelNoLanesAsXml;
  let processModelPathNameMismatchAsXml;
  let processModelPathTooManyProcessesAsXml;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    processModelAsXml = testFixtureProvider.readProcessModelFile(processModelId);
    processModelNoLanesAsXml = testFixtureProvider.readProcessModelFile(processModelIdNoLanes);
    processModelPathNameMismatchAsXml = testFixtureProvider.readProcessModelFile(processModelIdNameMismatch);
    processModelPathTooManyProcessesAsXml = testFixtureProvider.readProcessModelFile(processModelIdTooManyProcesses);
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
      .managementApiClient
      .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelId, importPayload);

    await assertThatImportWasSuccessful();
  });

  it('should successfully import the ProcessDefinition, if the requesting user is a SuperAdmin', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    await testFixtureProvider
      .managementApiClient
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
        .managementApiClient
        .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelId, importPayload);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /already exists/i;
      const expectedErrorCode = 409;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should successfully import a ProcessModel without any lanes', async () => {

    const importPayload = {
      xml: processModelNoLanesAsXml,
      overwriteExisting: true,
    };

    await testFixtureProvider
      .managementApiClient
      .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelIdNoLanes, importPayload);
    await assertThatImportWasSuccessful();
  });

  it('should fail to deploy the ProcessModel, when the user is unauthorized', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    try {
      const processModel = await testFixtureProvider
        .managementApiClient
        .updateProcessDefinitionsByName({}, processModelId, importPayload);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to deploy the ProcessModel, if the User does not have the required claim', async () => {

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    try {
      const processModel = await testFixtureProvider
        .managementApiClient
        .updateProcessDefinitionsByName(testFixtureProvider.identities.restrictedUser, processModelId, importPayload);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  // Note: Current restrictions state that a ProcessModel must have the same name as the Definition file.
  // Otherwise the ProcessModel would not be retrievable.
  it('should fail to import a ProcessModel, when the ProcessModel name does not match the ProcessDefinition name', async () => {

    const importPayload = {
      xml: processModelPathNameMismatchAsXml,
      overwriteExisting: false,
    };

    try {
      await testFixtureProvider
        .managementApiClient
        .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelIdNameMismatch, importPayload);
      should.fail(undefined, 'error', 'This request should have failed, because ProcessModel name differs from the ProcessDefinitions name!');
    } catch (error) {
      const expectedErrorMessage = /ProcessModel contained within the diagram.*?must also use the name/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  // Note: This may be supported in future versions, but right now such a BPMN file would break everything.
  // So we need to make sure that those types of ProcessModels do not get deployed.
  // Otherwise, BPMN Studio will be unable to use the Runtime at all.
  it('should fail to import a ProcessModel, when the file contains more than one Process', async () => {

    const importPayload = {
      xml: processModelPathTooManyProcessesAsXml,
      overwriteExisting: false,
    };

    try {
      await testFixtureProvider
        .managementApiClient
        .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelIdTooManyProcesses, importPayload);
      should.fail(undefined, 'error', 'This request should have failed, because the ProcessDefinition has more than one model!');
    } catch (error) {
      const expectedErrorMessage = /contains more than one ProcessModel/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  async function assertThatImportWasSuccessful() {

    const existingProcessModel = await testFixtureProvider
      .managementApiClient
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
  }

});
