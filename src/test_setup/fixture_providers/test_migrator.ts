import * as fs from 'fs';
import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Umzug from 'umzug';

import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

const sequelizeConnectionManager: SequelizeConnectionManager = new SequelizeConnectionManager();

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
export async function migrate(repositoryName: string): Promise<void> {

  const env = process.env.NODE_ENV || 'test-postgres';

  const sequelizeInstanceConfig = getConfig(env, repositoryName);

  let sequelizeInstance;
  try {
    sequelizeInstance = await sequelizeConnectionManager.getConnection(sequelizeInstanceConfig);

  } catch (error) {
    console.log('@@@@@@@@ HIER ERROR');
    console.log(error);
  }

  const umzugInstance = await createUmzugInstance(sequelizeInstance, repositoryName, sequelizeInstanceConfig.dialect);
  await umzugInstance.up();

  await sequelizeConnectionManager.destroyConnection(sequelizeInstanceConfig);
}

function getConfig(env: string, repositoryName: string): Sequelize.Options {

  const config = readConfigFile(env, `${repositoryName}_repository.json`);

  if (config.dialect === 'sqlite') {
    // Jenkins stores its sqlite databases in a separate workspace folder.
    // We must account for this here.
    const sqlitePath = process.env.jenkinsDbStoragePath
      ? path.resolve(`${process.env.jenkinsDbStoragePath}, ${config.storage}`)
      : config.storage;

    config.storage = sqlitePath;
  }

  // Jenkins uses customized host names for mysql and postgres. We need to account for that fact here,
  // or the migrations will fail.
  const customHostName = process.env[`process_engine__${repositoryName}_repository__host`];

  if (customHostName !== undefined) {
    config.host = customHostName;
  }

  return config;
}

async function createUmzugInstance(sequelize: Sequelize.Sequelize, database: string, dbDialect: string): Promise<Umzug.Umzug> {

  let dirNameNormalized = path.normalize(process.cwd());
  const appAsarPathPart = path.normalize(path.join('.', 'app.asar'));

  if (dirNameNormalized.indexOf('app.asar') > -1) {
    dirNameNormalized = dirNameNormalized.replace(appAsarPathPart, '');
  }

  const migrationsPath = path.join(dirNameNormalized, 'sequelize', 'migrations', database);

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
        dbDialect,
      ],
      path: migrationsPath,
      pattern: /\.js$/,
    },
    logging: (args: any): void => {
      console.log(args);
    },
  });

  return umzug;
}

function readConfigFile(env: string, repositoryConfigFileName: string): Sequelize.Options {

  const configFilePath = path.resolve(process.env.CONFIG_PATH, env, 'process_engine', repositoryConfigFileName);

  const fileContent = fs.readFileSync(configFilePath, 'utf-8');

  const parsedFileContent = JSON.parse(fileContent) as Sequelize.Options;

  return parsedFileContent;
}
