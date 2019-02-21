'use strict';

const should = require('should');

const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Deployment API -> Sanity checks after import', () => {

  let testFixtureProvider;

  const processModelId = 'generic_deployment_sanity_check';
  const processModelUpdatedId = 'generic_deployment_sanity_check_updated';

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

  it('should always return the most up to date version of any ProcessDefinition', async () => {

    const existingProcessModel = await testFixtureProvider
      .processModelUseCases
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
    should(existingProcessModel.id).be.equal(processModelId);

    const startEvent = existingProcessModel.flowNodes.find((flowNode) => {
      return flowNode.constructor.name === 'StartEvent';
    });

    // The difference between the two process models is the ID of their StartEvent.
    // We must be expecting the updated StartEvent ID.
    const expectedStartEventId = 'StartEvent_666';

    should.exist(startEvent);
    should(startEvent.id).be.equal(expectedStartEventId, `Received an unexpected StartEventId: ${startEvent.id}`);
  });

  it('should not contain outdated versions of any ProcessDefinitions, when querying all ProcessDefinitions', async () => {

    const processModels = await testFixtureProvider
      .processModelUseCases
      .getProcessModels(testFixtureProvider.identities.defaultUser);

    const occurencesOfTestProcessModel = processModels.filter((item) => {
      return item.id === processModelId;
    });

    should(occurencesOfTestProcessModel.length).be.equal(1);
  });

  async function performImport(xml) {

    const importPayload = {
      name: processModelId,
      xml: xml,
      overwriteExisting: true,
    };

    await testFixtureProvider.deploymentApiService.importBpmnFromXml(testFixtureProvider.identities.defaultUser, importPayload);
  }

});
