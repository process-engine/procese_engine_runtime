'use strict';

const fs = require('fs');
const path = require('path');
const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ConsumerAPI: getApplicationInfo', () => {

  let packageJson;

  let testFixtureProvider;
  let defaultIdentity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    packageJson = readPackageJson();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('Should get the name and version of the ProcessEngineRuntime, when providing an auth token', async () => {

    const result = await testFixtureProvider
      .consumerApiClient
      .getApplicationInfo(defaultIdentity);

    assertResponse(result);
  });

  it('Should get the name and version of the ProcessEngineRuntime, when not providing an auth token', async () => {

    const result = await testFixtureProvider
      .consumerApiClient
      .getApplicationInfo();

    assertResponse(result);
  });

  function readPackageJson() {
    const pathToPackageJson = path.resolve(process.cwd(), 'package.json');
    const packageJsonAsString = fs.readFileSync(pathToPackageJson, 'utf-8');

    return JSON.parse(packageJsonAsString);
  }

  function assertResponse(response) {
    should(response.name).be.equal(packageJson.name);
    should(response.version).be.equal(packageJson.version);
  }

});
