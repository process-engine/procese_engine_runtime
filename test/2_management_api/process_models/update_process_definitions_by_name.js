'use strict';

const should = require('should');
const uuid = require('uuid');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

// NOTE:
// The deployment api alrady contains extensive testing for this, so there is no need to cover everything here.
// We just need to ensure that all commands get passed correctly to the deployment api and leave the rest up to it.
describe('Management API:   POST  ->  /process_models/:process_model_id/update', () => {

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

  it('should successfully import the process definitions, if it does not yet exist and overwriteExisting is set to false', async () => {

    // This is to ensure that any existing process definitions will not falsify the results.
    const uniqueImportName = uuid.v4();

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    await testFixtureProvider
      .managementApiClientService
      .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, uniqueImportName, importPayload);

    await assertThatImportWasSuccessful();
  });

  async function assertThatImportWasSuccessful() {

    const processModelService = await testFixtureProvider.resolveAsync('ProcessModelService');

    const existingProcessModel = await processModelService.getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
  }

});
