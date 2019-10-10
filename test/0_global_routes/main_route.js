'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

const HttpClient = require('@essential-projects/http').HttpClient;

describe('Main Route http://localhost:32413 - ', () => {

  let httpClient;

  let testFixtureProvider;

  const routeToCall = '';

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

  it('Should return infos about the application, when an auth token is provided', async () => {

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

  it('Should return infos about the application, even when no auth token is provided', async () => {

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

  it(`Should return info about the application, when the route with the 'process_engine' prefix is used`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await httpClient.get(`process_engine/${routeToCall}`, requestHeaders);
      assertResponse(response);
    } catch (error) {
      should.fail(error, 'success', `Failed to run the request: ${error.message}`);
    }
  });

  function assertResponse(response) {

    should(response.status).be.equal(200);

    const actualResult = response.result;

    const expectedResult = {
      name: '@process-engine/process_engine_runtime',
      description: 'Standalone application that provides access to the .TS implementation of the ProcessEngine.',
      license: 'MIT',
      homepage: 'https://www.process-engine.io/',
      author: {
        name: '5Minds IT-Solutions GmbH & Co. KG',
        email: 'info@5minds.de',
        url: 'https://5minds.de/',
      },
      repository: {
        type: 'git',
        url: 'git+https://github.com/process-engine/procese_engine_runtime.git',
      },
      bugs: {
        url: 'https://github.com/process-engine/procese_engine_runtime/issues',
      },
    };

    should(actualResult.name).be.equal(expectedResult.name);
    should(actualResult).have.property('version'); // Asserting values here is pointless, as they change frequently.
    should(actualResult.description).be.equal(expectedResult.description);
    should(actualResult.license).be.equal(expectedResult.license);
    should(actualResult.homepage).be.equal(expectedResult.homepage);
    should(actualResult.author).be.eql(expectedResult.author);
    should(actualResult).have.property('contributors'); // This can be somewhat flexible as well.
    should(actualResult.repository).be.eql(expectedResult.repository);
    should(actualResult.bugs).be.eql(expectedResult.bugs);
  }
});
