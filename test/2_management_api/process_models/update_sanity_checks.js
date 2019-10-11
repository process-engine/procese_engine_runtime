'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI -> Sanity checks for ProcessModel update', () => {

  let testFixtureProvider;

  const processModelId = 'test_management_api_deployment_sanity_check';
  const processModelUpdatedId = 'test_management_api_deployment_sanity_check_updated';

  let processModelXml;
  let processModelUpdatedXml;

  before(async () => {

    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    processModelXml = testFixtureProvider.readProcessModelFile(processModelId);
    processModelUpdatedXml = testFixtureProvider.readProcessModelFile(processModelUpdatedId);

    await performImport(processModelXml);
    await performImport(processModelUpdatedXml);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should always return the most up to date version of any ProcessModel', async () => {

    const existingProcessModel = await testFixtureProvider
      .managementApiClient
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
    should(existingProcessModel.id).be.equal(processModelId);

    const startEvent = existingProcessModel.startEvents[0];

    // The difference between the two process models is the ID of their StartEvent.
    // We must be expecting the updated StartEvent ID.
    const expectedStartEventId = 'StartEvent_666';

    should.exist(startEvent);
    should(startEvent.id).be.equal(expectedStartEventId, `Received an unexpected StartEventId: ${startEvent.id}`);
  });

  it('should not contain outdated versions of any ProcessModels, when querying all ProcessModels', async () => {

    const processModels = await testFixtureProvider
      .managementApiClient
      .getProcessModels(testFixtureProvider.identities.defaultUser);

    const occurencesOfTestProcessModel = processModels.processModels.filter((item) => {
      return item.id === processModelId;
    });

    should(occurencesOfTestProcessModel).have.a.lengthOf(1);
  });

  async function performImport(xml) {

    const importPayload = {
      xml: xml,
      overwriteExisting: true,
    };

    await testFixtureProvider
      .managementApiClient
      .updateProcessDefinitionsByName(testFixtureProvider.identities.defaultUser, processModelId, importPayload);
  }

});
