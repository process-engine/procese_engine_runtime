'use strict';

const should = require('should');

describe.only('Jenkins Publishing test', () => {

  it.only('Provokes a failed test to see if jenkins will publish something afterwards', async () => {
    should.fail('bla', undefined, 'This is a forced error to test the Jenkins publishing behavior.');
  });
});
