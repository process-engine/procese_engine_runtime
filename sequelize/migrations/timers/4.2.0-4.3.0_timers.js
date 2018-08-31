'use strict';

const Logger = require('loggerhythm').Logger;

const logger = Logger.createLogger('process-engine:migration:sequelize');

// See manual:
// https://sequelize.readthedocs.io/en/latest/docs/migrations/#functions
module.exports = {
  up: async (queryInterface, Sequelize) => {
    logger.info('No migrations for timers storage necessary');
  },
  down: async (queryInterface, Sequelize) => {
    logger.info('Running reverting migrations');
    return Promise.resolve();
  },
};
