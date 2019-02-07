import * as Bluebird from 'bluebird';

// By default, Promise-Cancellation is deactivated.
// We need to activate it here in order to be able to use it.
Bluebird.config({
  cancellation: true,
});

// This will make Bluebird the default Promise implementation throughout the core package.
global.Promise = Bluebird;

export * from './fixture_providers/index';
export * from './mocks/index';
export * from './test_services/index';
