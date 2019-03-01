'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

const undeployRoute = 'api/deployment/v1/undeploy_process_model/:process_model_id';
describe(`Deployment API -> POST ${undeployRoute}`, () => {

  let testFixtureProvider;

  let authHeadersDefault;
  let authHeadersForbidden;
  const authHeadersUnauthenticated = {};

  let httpClient;

  const processModelId = 'generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    authHeadersDefault = createRequestAuthHeaders(testFixtureProvider.identities.defaultUser);
    authHeadersForbidden = createRequestAuthHeaders(testFixtureProvider.identities.restrictedUser);

    httpClient = await testFixtureProvider.resolveAsync('HttpClient');

    await importTestBpmn();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully undeploy a ProcessModel', async () => {

    const route = undeployRoute.replace(':process_model_id', processModelId);

    await httpClient.post(route, {}, authHeadersDefault);

    await assertThatUndeployWasSuccessful();
  });

  it('should not throw an error when attempting to undeploy a non-existing ProcessModel', async () => {

    const nonExistingProcessModelId = 'iwasneverhere';
    const route = undeployRoute.replace(':process_model_id', nonExistingProcessModelId);

    await httpClient.post(undeployRoute, {}, authHeadersDefault);
  });

  it('should fail to undeploy a ProcessModel, when the user is unauthorized', async () => {

    const route = undeployRoute.replace(':process_model_id', processModelId);

    try {
      await httpClient.post(undeployRoute, {}, authHeadersUnauthenticated);
      should.fail({}, 'error', 'This request should have failed, due to missing user authentication!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  it('should fail to undeploy a ProcessModel, when the user is forbidden to do so', async () => {

    const route = undeployRoute.replace(':process_model_id', processModelId);

    try {
      await httpClient.post(undeployRoute, {}, authHeadersForbidden);
      should.fail({}, 'error', 'This request should have failed, due to missing user authentication!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  async function importTestBpmn() {
    const processModelAsXml = testFixtureProvider.readProcessModelFile(processModelId);

    const importPayload = {
      name: processModelId,
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    await httpClient.post(undeployRoute, importPayload, authHeadersDefault);
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

  async function assertThatUndeployWasSuccessful() {

    try {
      const existingProcessModel = await testFixtureProvider
        .processModelUseCases
        .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

      should.fail(existingProcessModel, undefined, 'This should have failed, because the ProcessModel should no longer exist!');
    } catch (error) {
      const expectedErrorMessage = /not found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  }

});
