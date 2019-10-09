'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

const HttpClient = require('@essential-projects/http').HttpClient;

describe('Main Route Sanity checks', () => {

  let httpClient;

  let testFixtureProvider;

  before(async () => {
    process.env.DO_NOT_BLOCK_GLOBAL_ROUTE = true;
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    httpClient = new HttpClient();
    httpClient.config = {
      url: 'http://localhost:32413',
    };
  });

  after(async () => {
    process.env.DO_NOT_BLOCK_GLOBAL_ROUTE = undefined;
    await testFixtureProvider.tearDown();
  });

  it(`Should block global route '/', when DO_NOT_BLOCK_GLOBAL_ROUTE is set to true`, async () => {

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

  it(`Should block global route '/security/authority', when DO_NOT_BLOCK_GLOBAL_ROUTE is set to true`, async () => {

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

  it(`Should not block global route '/process_engine', when DO_NOT_BLOCK_GLOBAL_ROUTE is set to true`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    const response = await httpClient.get('process_engine', requestHeaders);
    should(response.status).be.equal(200);
  });

  it(`Should not block global route '/process_engine/security/authority', when DO_NOT_BLOCK_GLOBAL_ROUTE is set to true`, async () => {

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
