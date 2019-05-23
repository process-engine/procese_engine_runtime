'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Deployment API -> undeploy', () => {

  let testFixtureProvider;
  let defaultIdentity;
  let restrictedIdentity;

  const processModelId = 'generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await importTestBpmn();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully undeploy a ProcessModel', async () => {
    await testFixtureProvider.deploymentApiService.undeploy(defaultIdentity, processModelId);
    await assertThatUndeployWasSuccessful();
  });

  it('should not throw an error when attempting to undeploy a non-existing ProcessModel', async () => {
    const nonExistingProcessModelId = 'iwasneverhere';
    await testFixtureProvider.deploymentApiService.undeploy(defaultIdentity, nonExistingProcessModelId);
  });

  it('should fail to undeploy a ProcessModel, when the user is unauthorized', async () => {
    try {
      await testFixtureProvider.deploymentApiService.undeploy({}, processModelId);
      should.fail({}, 'error', 'This request should have failed, due to missing user authentication!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  it('should fail to undeploy a ProcessModel, when the user is forbidden to do so', async () => {
    try {
      await testFixtureProvider.deploymentApiService.undeploy(restrictedIdentity, processModelId);
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

    await testFixtureProvider.deploymentApiService.importBpmnFromXml(defaultIdentity, importPayload);
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
      should(error.code).be.equal(expectedErrorCode);
    }
  }
});
