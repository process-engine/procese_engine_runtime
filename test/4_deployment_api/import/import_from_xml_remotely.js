'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

const importRoute = 'api/deployment/v1/import_process_model';
describe(`Deployment API -> POST ${importRoute}`, () => {

  let testFixtureProvider;

  let authHeadersDefault;
  let authHeadersForbidden;
  const authHeadersUnauthenticated = {};

  let httpClient;

  const processModelId = 'generic_sample';
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

    authHeadersDefault = createRequestAuthHeaders(testFixtureProvider.identities.defaultUser);
    authHeadersForbidden = createRequestAuthHeaders(testFixtureProvider.identities.restrictedUser);

    processModelAsXml = testFixtureProvider.readProcessModelFile(processModelId);
    processModelNoLanesAsXml = testFixtureProvider.readProcessModelFile(processModelIdNoLanes);
    processModelPathNameMismatchAsXml = testFixtureProvider.readProcessModelFile(processModelIdNameMismatch);
    processModelPathTooManyProcessesAsXml = testFixtureProvider.readProcessModelFile(processModelIdTooManyProcesses);

    httpClient = await testFixtureProvider.resolveAsync('HttpClient');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully import a ProcessModel', async () => {

    const importPayload = {
      name: processModelId,
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    await httpClient.post(importRoute, importPayload, authHeadersDefault);
    await assertThatImportWasSuccessful();
  });

  it('should successfully import a ProcessModel without any lanes', async () => {

    const importPayload = {
      name: processModelIdNoLanes,
      xml: processModelNoLanesAsXml,
      overwriteExisting: true,
    };

    await httpClient.post(importRoute, importPayload, authHeadersDefault);
    await assertThatImportWasSuccessful();
  });

  it('should fail to import a ProcessModel, if a process model by the same name exists, and overwriteExisting is set to false', async () => {

    try {
      const importPayload = {
        name: processModelId,
        xml: processModelAsXml,
        overwriteExisting: false,
      };

      // Run this twice to ensure that this test case is always executable.
      await httpClient.post(importRoute, importPayload, authHeadersDefault);
      await httpClient.post(importRoute, importPayload, authHeadersDefault);

      should.fail(undefined, 'error', 'This request should have failed, because the process model already exists!');
    } catch (error) {
      const expectedErrorMessage = /already exists/i;
      const expectedErrorCode = 409;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }

  });

  it('should fail to import a ProcessModel, when the user is not authenticated', async () => {

    const importPayload = {
      name: processModelId,
      xml: processModelAsXml,
      overwriteExisting: false,
    };

    try {
      await httpClient.post(importRoute, importPayload, authHeadersUnauthenticated);
      should.fail({}, 'error', 'This request should have failed, due to missing user authentication!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  it('should fail to import a ProcessModel, when the user is forbidden to see the process instance result', async () => {

    const importPayload = {
      name: processModelId,
      xml: processModelAsXml,
      overwriteExisting: false,
    };

    try {
      await httpClient.post(importRoute, importPayload, authHeadersForbidden);
      should.fail(undefined, 'error', 'This request should have failed, due to a missing claim!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  // Note: Current restrictions state that a ProcessModel must have the same name as the Definition file.
  // Otherwise the ProcessModel would not be retrievable.
  it('should fail to import a ProcessModel, when the ProcessModel name does not match the ProcessDefinition name', async () => {

    const importPayload = {
      name: processModelIdNameMismatch,
      xml: processModelPathNameMismatchAsXml,
      overwriteExisting: false,
    };

    try {
      await httpClient.post(importRoute, importPayload, authHeadersDefault);
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
      name: processModelIdTooManyProcesses,
      xml: processModelPathTooManyProcessesAsXml,
      overwriteExisting: false,
    };

    try {
      await httpClient.post(importRoute, importPayload, authHeadersDefault);
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
      .processModelUseCases
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
  }

  function createRequestAuthHeaders(identity) {
    const noTokenProvided = !identity || typeof identity.token !== 'string';
    if (noTokenProvided) {
      return {};
    }

    const requestAuthHeaders = {
      headers: {
        Authorization: `Bearer ${identity.token}`,
      },
    };

    return requestAuthHeaders;
  }

});
