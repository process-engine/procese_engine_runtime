import * as fs from 'fs';
import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Umzug from 'umzug';

import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

const sequelizeConnectionManager: SequelizeConnectionManager = new SequelizeConnectionManager();

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
export async function migrate(repositoryName: string): Promise<void> {

  const env = process.env.NODE_ENV || 'test-postgres';

  const repositoryConfigFileName = `${repositoryName}_repository.json`;

  let sequelizeInstanceConfig: Sequelize.Options;

  switch (env) {
    case 'test-mysql':
      sequelizeInstanceConfig = getMysqlConfig(repositoryConfigFileName, repositoryName);
      break;
    case 'test-postgres':
      sequelizeInstanceConfig = getPostgresConfig(repositoryConfigFileName, repositoryName);
      break;
    case 'test-sqlite':
      sequelizeInstanceConfig = getSQLiteConfig(repositoryConfigFileName, repositoryName);
      break;
    default:
      throw new Error(`Selected NODE_ENV ${env} is not valid for integration tests!`);
  }

  const sequelizeInstance = await sequelizeConnectionManager.getConnection(sequelizeInstanceConfig);

  const umzugInstance = await createUmzugInstance(sequelizeInstance, repositoryName);
  await umzugInstance.up();

  await sequelizeConnectionManager.destroyConnection(sequelizeInstanceConfig);
}

function getMysqlConfig(configFileName: string, repositoryName: string): Sequelize.Options {

  let mysqlConfig = readConfigFile('test-mysql', configFileName);

  mysqlConfig = applyCustomHostNameFromEnv(mysqlConfig, repositoryName);

  return mysqlConfig;
}

function getPostgresConfig(configFileName: string, repositoryName: string): Sequelize.Options {

  let postgresConfig = readConfigFile('test-postgres', configFileName);

  postgresConfig = applyCustomHostNameFromEnv(postgresConfig, repositoryName);

  return postgresConfig;
}

function getSQLiteConfig(configFileName: string, repositoryName: string): Sequelize.Options {

  const sqliteConfig = readConfigFile('test-sqlite', configFileName);

  // Jenkins stores its sqlite databases in a separate workspace folder.
  // We must account for this here.
  const sqlitePath = process.env.jenkinsDbStoragePath
    ? `${process.env.jenkinsDbStoragePath}/${repositoryName}.sqlite`
    : `test/sqlite_repositories/${repositoryName}.sqlite`;

  sqliteConfig.storage = `${sqlitePath}`;

  return sqliteConfig;
}

function applyCustomHostNameFromEnv(config: Sequelize.Options, repositoryName: string): Sequelize.Options {

  // Jenkins uses customized host names for mysql and postgres. We need to account for that fact here,
  // or the migrations will fail.
  const customHostName = process.env[`process_engine__${repositoryName}_repository__host`];

  const customHostNameSet = customHostName !== undefined;
  if (customHostNameSet) {
    // eslint-disable-next-line
    config.host = customHostName;
  }

  return config;
}

async function createUmzugInstance(sequelize: Sequelize.Sequelize, database: string): Promise<Umzug.Umzug> {

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
        (): void => {
          throw new Error('Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.');
        },
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
