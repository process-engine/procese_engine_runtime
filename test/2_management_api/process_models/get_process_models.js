'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI:   GET  ->  /processModels', () => {

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

  it('should return ProcessModels through the ManagementAPI', async () => {

    const processModelList = await testFixtureProvider
      .managementApiClientService
      .getProcessModels(testFixtureProvider.identities.defaultUser);

    should(processModelList).have.property('processModels');

    should(processModelList.processModels).be.instanceOf(Array);
    should(processModelList.processModels.length).be.greaterThan(0);

    processModelList.processModels.forEach((processModel) => {
      should(processModel).have.property('id');
      should(processModel).have.property('xml');
      should(processModel).have.property('startEvents');
      should(processModel).have.property('endEvents');
      should(processModel.startEvents).be.instanceOf(Array);
      should(processModel.endEvents).be.instanceOf(Array);
    });
  });

  it('should fail to retrieve a list of ProcessModels, when the user is unauthorized', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getProcessModels({});

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
