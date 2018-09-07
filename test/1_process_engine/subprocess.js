'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_fixture_provider').TestFixtureProvider;

describe('SubProcess', () => {

  let testFixtureProvider;

  const processModelId = 'subprocess_test';
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should execute SubProcess and update token.', async () => {

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId);
    const expectedResult = {
      secondTest: '123456',
    };

    should(result).have.property('tokenPayload');
    should(result.tokenPayload).be.eql(expectedResult);
  });

});
