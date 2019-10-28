'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

const HttpClient = require('@essential-projects/http').HttpClient;

describe('Root Http Route Sanity checks', () => {

  let httpClient;

  let testFixtureProvider;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart(true, false);

    httpClient = new HttpClient();
    httpClient.config = {
      url: 'http://localhost:32413',
    };
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it(`Should disable '/' route, when useHttpRootRoutes is set to false`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    try {
      const response = await httpClient.get('', requestHeaders);
      should.fail(response, 'error', `This route should not be available!`);
    } catch (error) {
      should(error.code).be.equal(404);
    }
  });

  it(`Should disable '/security/authority' route, when useHttpRootRoutes is set to false`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    try {
      const response = await httpClient.get('security/authority', requestHeaders);
      should.fail(response, 'error', `This route should not be available!`);
    } catch (error) {
      should(error.code).be.equal(404);
    }
  });

  it(`Should not disable '/process_engine' route, when useHttpRootRoutes is set to false`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    const response = await httpClient.get('process_engine', requestHeaders);
    should(response.status).be.equal(200);
  });

  it(`Should not disable '/process_engine/ routesecurity/authority', when useHttpRootRoutes is set to false`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    const response = await httpClient.get('process_engine/security/authority', requestHeaders);
    should(response.status).be.equal(200);
  });
});
