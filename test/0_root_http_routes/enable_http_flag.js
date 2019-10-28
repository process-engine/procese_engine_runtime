'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

const HttpClient = require('@essential-projects/http').HttpClient;

const consumerApiRestSettings = require('@process-engine/consumer_api_contracts').restSettings;
const managementApiRestSettings = require('@process-engine/management_api_contracts').restSettings;

describe('Disable HttpEndpoints - ', () => {

  let httpClient;

  let testFixtureProvider;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart(false);

    httpClient = new HttpClient();
    httpClient.config = {
      url: 'http://localhost:32413',
    };
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it(`Global route '/' should not be available`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    try {
      const response = await httpClient.get('', requestHeaders);
      should.fail(response, undefined, `The HTTP endpoint should be disabled!`);
    } catch (error) {
      should(error.code).be.equal('EUNAVAILABLE');
    }
  });

  it(`Global route '/security/authority' should not be available`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    try {
      const routeToCall = 'security/authority';
      const response = await httpClient.get(routeToCall, requestHeaders);
      should.fail(response, undefined, `The HTTP endpoint should be disabled!`);
    } catch (error) {
      should(error.code).be.equal('EUNAVAILABLE');
    }
  });

  it(`The Consumer API routes should not be available`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    const routeNames = Object.keys(consumerApiRestSettings.paths);

    for (let i = 0; i <= routeNames.length; i++) {
      const route = `api/consumer/v1/${routeNames[i]}`;

      const responseCode = await sendHttpRequest(route, requestHeaders);
      should(responseCode).be.equal('EUNAVAILABLE', `HTTP endpoints are disabled, but the route "${route}" was still accessible!`);
    }
  });

  it(`The Management API routes should not be available`, async () => {

    const requestHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: testFixtureProvider.identities.defaultUser,
      },
    };

    const routeNames = Object.keys(managementApiRestSettings.paths);

    for (let i = 0; i <= routeNames.length; i++) {
      const route = `api/management/v1/${routeNames[i]}`;

      const responseCode = await sendHttpRequest(route, requestHeaders);
      should(responseCode).be.equal('EUNAVAILABLE', `HTTP endpoints are disabled, but the route "${route}" was still accessible!`);
    }
  });

  async function sendHttpRequest(route, requestHeaders) {

    try {
      const response = await httpClient.get(route, requestHeaders);
      return response.status;
    } catch (error) {
      return error.code;
    }
  }
});
