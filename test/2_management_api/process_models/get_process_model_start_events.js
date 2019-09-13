'use strict';

const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI:   GET  ->  /process_models/:process_model_id/events', () => {

  let testFixtureProvider;

  const processModelId = 'test_management_api_generic_sample';
  const processModelIdRestricted = 'test_management_api_emptyactivity';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId, processModelIdRestricted]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a ProcessModel\'s StartEvents by its ProcessModelId through the ManagementAPI, if the user has all required LaneClaims', async () => {

    const processModel = await testFixtureProvider
      .managementApiClient
      .getStartEventsForProcessModel(testFixtureProvider.identities.defaultUser, processModelId);

    should(processModel).have.property('events');
    should(processModel.events).be.an.instanceOf(Array);
    should(processModel.events.length).be.greaterThan(0);

    for (const event of processModel.events) {
      should(event).have.property('id');
    }
  });

  it('should return a ProcessMode\'s StartEvents by its ProcessModelId through the ManagementAPI, if the user is a SuperAdmin', async () => {

    const processModel = await testFixtureProvider
      .managementApiClient
      .getStartEventsForProcessModel(testFixtureProvider.identities.superAdmin, processModelId);

    should(processModel).have.property('events');
    should(processModel.events).be.an.instanceOf(Array);
    should(processModel.events.length).be.greaterThan(0);

    for (const event of processModel.events) {
      should(event).have.property('id');
    }
  });

  it('should fail to retrieve the ProcessModel, when the ProcessModel does not exist', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClient
        .getStartEventsForProcessModel(testFixtureProvider.identities.defaultUser, 'SomeInvalidProcessModelId');

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /Not found./i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the ProcessModel, when the user is unauthorized', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClient
        .getStartEventsForProcessModel({}, processModelId);

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
        .managementApiClient
        .getStartEventsForProcessModel(testFixtureProvider.identities.restrictedUser, processModelIdRestricted);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

});
