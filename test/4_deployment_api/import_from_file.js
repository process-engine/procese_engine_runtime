'use strict';

const should = require('should');
const path = require('path');
const uuid = require('uuid');

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Deployment API -> importBpmnFromFile', () => {

  let testFixtureProvider;
  let defaultIdentity;
  let restrictedIdentity;

  const processModelId = 'generic_sample';
  let processModelPath;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    const bpmnFolderLocation = testFixtureProvider.getBpmnDirectoryPath();
    processModelPath = path.join(bpmnFolderLocation, `${processModelId}.bpmn`);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully import the process model, if it does not yet exist and overwriteExisting is set to false', async () => {

    // This is to ensure that any existing process models will not falsify the results.
    const uniqueImportName = uuid.v4();

    await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, uniqueImportName, false);

    await assertThatImportWasSuccessful();
  });

  it('should successfully import the process model, if it already exists and overwriteExisting is set to true', async () => {

    // This is to ensure that any existing process models will not falsify the results.
    const uniqueImportName = uuid.v4();

    // The value of overwriteExisting doesn't matter for the first import run.
    await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, uniqueImportName);
    await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, uniqueImportName, true);

    await assertThatImportWasSuccessful();
  });

  it('should fail to import the process model, if a process model by the same name exists, and overwriteExisting is set to false', async () => {

    try {

      // This is to ensure that any existing process models will not falsify the results.
      const uniqueImportName = uuid.v4();

      // The value of overwriteExisting doesn't matter for the first import run.
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, uniqueImportName);
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, uniqueImportName, false);

      should.fail(undefined, 'error', 'This request should have failed, because the process model already exists!');
    } catch (error) {
      const expectedErrorCode = 409;
      const expectedErrorMessage = /already exists/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }

  });

  it('should fail to import the process model, when the user is not authenticated', async () => {

    try {
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(undefined, processModelPath);
      should.fail({}, 'error', 'This request should have failed, due to missing user authentication!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to import the process model, when the user is forbidden to see the process instance result', async () => {

    try {
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(restrictedIdentity, processModelPath);
      should.fail(undefined, 'error', 'This request should have failed, due to a missing claim!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function assertThatImportWasSuccessful() {

    const existingProcessModel = await testFixtureProvider
      .processModelService
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
  }

});
