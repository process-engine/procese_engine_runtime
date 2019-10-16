import * as Bluebird from 'bluebird';

// By default, Promise-Cancellation is deactivated.
// We need to activate it here in order to be able to use it.
Bluebird.config({
  cancellation: true,
});

// This will make Bluebird the default Promise implementation throughout the core package.
global.Promise = Bluebird;

export * from './modules/index';
export * from './main';
