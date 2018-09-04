'use strict';

const path = require('path');
const Umzug = require('umzug');
const sequelizeConnectionManager = require('@essential-projects/sequelize_connection_manager');

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
module.exports.migrate = async (env, database, sqlitePath) => {

  sqlitePath = getFullSqliteStoragePath(sqlitePath);

  const sequelizeInstance = env === `sqlite`
    ? await createSqLiteConnection(sqlitePath, database)
    : await createPostgresConnection(database);

  const umzugInstance = await createUmzugInstance(sequelizeInstance, database);
  await umzugInstance.up();
}

async function createSqLiteConnection(sqlitePath, store) {
  const databaseFullPath = path.resolve(sqlitePath, store);

  const sqliteConfig = {
    username: null,
    password: null,
    database: null,
    host: null,
    port: null,
    dialect: 'sqlite',
    storage: `${databaseFullPath}.sqlite`,
    supportBigNumbers: true,
    resetPasswordRequestTimeToLive: 12,
    logging: false
  };

  return sequelizeConnectionManager.getConnection(sqliteConfig);
}

async function createPostgresConnection(database) {

  const postgresConfig = {
    username: 'admin',
    password: 'admin',
    database: `${database}`,
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    supportBigNumbers: true,
    resetPasswordRequestTimeToLive: 12,
    logging: false
  };

  return sequelizeConnectionManager.getConnection(postgresConfig);
}

async function createUmzugInstance(sequelize, database) {

  let dirNameNormalized = path.normalize(__dirname);
  const appAsarPathPart = path.normalize(path.join('.', 'app.asar'));

  if (dirNameNormalized.indexOf('app.asar') > -1) {
    dirNameNormalized = dirNameNormalized.replace(appAsarPathPart, '');
  }

  let migrationsPath = path.join(dirNameNormalized, 'sequelize', 'migrations', database);

  const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize: sequelize,
    },
    // see: https://github.com/sequelize/umzug/issues/17
    migrations: {
      params: [
        sequelize.getQueryInterface(),
        sequelize.constructor,
        function () {
          throw new Error('Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.');
        }
      ],
      path: migrationsPath,
      pattern: /\.js$/
    },
    logging: (args) => {
      console.log(args);
    },
  });

  return umzug;
}

function getFullSqliteStoragePath(sqlitePath) {

  if (sqlitePath) {
    return sqlitePath;
  }

  const userDataFolderPath = require('platform-folders').getConfigHome();
  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}
