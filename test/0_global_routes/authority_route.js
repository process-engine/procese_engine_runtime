'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

const HttpClient = require('@essential-projects/http').HttpClient;

describe('Authority Route /security/authority - ', () => {

  let httpClient;

  let testFixtureProvider;

  const routeToCall = 'security/authority';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    httpClient = new HttpClient();
    httpClient.config = {
      url: 'http://localhost:32413',
    };
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it.only('Should return the address of the used authority, when an auth token is provided', async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    try {
      const response = await httpClient.get(routeToCall, requestHeaders);
      assertResponse(response);
    } catch (error) {
      should.fail(error, 'success', `Failed to run the request: ${error.message}`);
    }
  });

  it('Should return the address of the used authority, even when no auth token is provided', async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await httpClient.get(routeToCall, requestHeaders);
      assertResponse(response);
    } catch (error) {
      should.fail(error, 'success', `Failed to run the request: ${error.message}`);
    }
  });

  function assertResponse(response) {

    should(response.status).be.equal(200);

    const actualResult = response.result;

    const expectedResult = {
      authority: 'http://localhost:5000/',
    };

    should(actualResult).be.eql(expectedResult);
  }
});
