'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Umzug from 'umzug';

import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

const sequelizeConnectionManager: SequelizeConnectionManager = new SequelizeConnectionManager();

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
export async function migrate(repositoryName: string, sqlitePath: string): Promise<void> {

  const env: string = process.env.NODE_ENV || 'sqlite';

  sqlitePath = getFullSqliteStoragePath(sqlitePath);

  const sequelizeInstanceConfig: Sequelize.Options = env === 'sqlite'
    ? getSQLiteConfig(sqlitePath, repositoryName)
    : getPostgresConfig(repositoryName);

  const sequelizeInstance: Sequelize.Sequelize = await sequelizeConnectionManager.getConnection(sequelizeInstanceConfig);

  const umzugInstance: Umzug.Umzug = await createUmzugInstance(sequelizeInstance, repositoryName);
  await umzugInstance.up();

  await sequelizeConnectionManager.destroyConnection(sequelizeInstanceConfig);
}

function getSQLiteConfig(sqlitePath: string, repositoryName: string): object {

  const repositoryConfigFileName: string = `${repositoryName}_repository.json`;

  const sqliteConfig: Sequelize.Options = readConfigFile('sqlite', repositoryConfigFileName);

  const databaseFullPath: string = path.resolve(sqlitePath, sqliteConfig.storage);

  sqliteConfig.storage = `${databaseFullPath}`;

  return sqliteConfig;
}

function getPostgresConfig(repositoryName: string): object {

  const repositoryConfigFileName: string = `${repositoryName}_repository.json`;

  const postgresConfig: Sequelize.Options = readConfigFile('postgres', repositoryConfigFileName);

  return postgresConfig;
}

async function createUmzugInstance(sequelize: Sequelize.Sequelize, database: string): Promise<Umzug.Umzug> {

  // Must go two folders back to get out of /dist/commonjs.
  const rootDirName: string = path.join(__dirname, '..', '..');

  let dirNameNormalized: string = path.normalize(rootDirName);
  const appAsarPathPart: string = path.normalize(path.join('.', 'app.asar'));

  if (dirNameNormalized.includes('app.asar')) {
    dirNameNormalized = dirNameNormalized.replace(appAsarPathPart, '');
  }

  const migrationsPath: string = path.join(dirNameNormalized, 'sequelize', 'migrations', database);

  const umzug: Umzug.Umzug = new Umzug({
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
      // tslint:disable-next-line:no-console
      console.log(args);
    },
  });

  return umzug;
}

function getFullSqliteStoragePath(sqlitePath: string): string {

  if (sqlitePath) {
    return sqlitePath;
  }

  const userDataFolderPath: string = getUserConfigFolder();

  const userDataProcessEngineFolderName: string = 'process_engine_runtime';
  const processEngineDatabaseFolderName: string = 'databases';

  const databaseBasePath: string = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

function getUserConfigFolder(): string {

  const userHomeDir: string = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(userHomeDir, 'Library', 'Application Support');
    case 'win32':
      return path.join(userHomeDir, 'AppData', 'Roaming');
    default:
      return path.join(userHomeDir, '.config');
  }
}

function readConfigFile(env: string, repositoryConfigFileName: string): Sequelize.Options {

  const configFilePath: string = path.resolve(process.env.CONFIG_PATH, env, 'process_engine', repositoryConfigFileName);

  const fileContent: string = fs.readFileSync(configFilePath, 'utf-8');

  const parsedFileContent: Sequelize.Options = JSON.parse(fileContent) as Sequelize.Options;

  return parsedFileContent;
}
