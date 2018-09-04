'use strict';

// NOTE:
// This file is required, because electron will not unpack empty folders from the app.asar archive.
// But we need this folder, so that Sequelize will be able to run correctly.
// Apparently, keeping a .gitkeep in this folder is insufficient to ensure this.
// We can replace this file, once a migration is required for the Timers, but until then,
// this dummy file has to stay.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.resolve();
  },
  down: async (queryInterface, Sequelize) => {
    return Promise.resolve();
  },
};
