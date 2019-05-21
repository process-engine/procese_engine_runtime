'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI:   GET  ->  /process_models/:process_model_id', () => {

  let testFixtureProvider;

  const processModelId = 'generic_sample';
  const processModelIdRestricted = 'test_management_api_emptyactivity';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId, processModelIdRestricted]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a ProcessModel by its ProcessModelId through the ManagementAPI, if the User has all required LaneClaims', async () => {

    const processModel = await testFixtureProvider
      .managementApiClientService
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should(processModel).have.property('id');
    should(processModel).have.property('xml');
    should(processModel).have.property('startEvents');
    should(processModel).have.property('endEvents');
    should(processModel.startEvents.length).be.greaterThan(0);
    should(processModel.endEvents.length).be.greaterThan(0);
  });

  it('should return a ProcessModel by its ProcessModelId through the ManagementAPI, if the User is a SuperAdmin', async () => {

    const processModel = await testFixtureProvider
      .managementApiClientService
      .getProcessModelById(testFixtureProvider.identities.superAdmin, processModelId);

    should(processModel).have.property('id');
    should(processModel).have.property('xml');
    should(processModel).have.property('startEvents');
    should(processModel).have.property('endEvents');
    should(processModel.startEvents.length).be.greaterThan(0);
    should(processModel.endEvents.length).be.greaterThan(0);
  });

  it('should fail to retrieve the ProcessModel, if the ProcessModelId does not exist', async () => {

    const invalidProcessModelId = 'invalidProcessModelId';

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .getProcessModelById(testFixtureProvider.identities.defaultUser, invalidProcessModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /not found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the ProcessModel, when the user is unauthorized', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .getProcessModelById({}, processModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the ProcessModel, if the User does not have the required LaneClaims', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClientService
        .getProcessModelById(testFixtureProvider.identities.restrictedUser, processModelIdRestricted);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

});
