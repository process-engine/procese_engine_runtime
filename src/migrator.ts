import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Umzug from 'umzug';

import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

const sequelizeConnectionManager: SequelizeConnectionManager = new SequelizeConnectionManager();

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
export async function migrate(repositoryName: string, sqlitePath: string): Promise<void> {

  const env = process.env.NODE_ENV || 'sqlite';

  const fullSqlitePath = getFullSqliteStoragePath(sqlitePath);

  const repositoryConfigFileName = `${repositoryName}_repository.json`;

  let sequelizeInstanceConfig: Sequelize.Options;

  switch (env) {
    case 'test-mysql':
    case 'mysql':
      sequelizeInstanceConfig = getMysqlConfig(repositoryConfigFileName, repositoryName);
      break;
    case 'test-postgres':
    case 'postgres':
      sequelizeInstanceConfig = getPostgresConfig(repositoryConfigFileName, repositoryName);
      break;
    case 'test-sqlite':
    case 'sqlite':
      sequelizeInstanceConfig = getSQLiteConfig(fullSqlitePath, repositoryConfigFileName, repositoryName);
      break;
    default:
      throw new Error(`NODE_ENV '${env}' is not supported!`);
  }

  const sequelizeInstance = await sequelizeConnectionManager.getConnection(sequelizeInstanceConfig);

  const umzugInstance = await createUmzugInstance(sequelizeInstance, repositoryName);
  await umzugInstance.up();

  await sequelizeConnectionManager.destroyConnection(sequelizeInstanceConfig);
}

function getMysqlConfig(configFileName: string, repositoryName: string): object {
  return readConfigFile('mysql', configFileName);
}

function getPostgresConfig(configFileName: string, repositoryName: string): object {
  return readConfigFile('postgres', configFileName);
}

function getSQLiteConfig(sqlitePath: string, configFileName: string, repositoryName: string): object {

  const sqliteConfig = readConfigFile('sqlite', configFileName);

  const databaseFullPath = path.resolve(sqlitePath, sqliteConfig.storage);

  sqliteConfig.storage = `${databaseFullPath}`;

  return sqliteConfig;
}

async function createUmzugInstance(sequelize: Sequelize.Sequelize, database: string): Promise<Umzug.Umzug> {

  // Must go two folders back to get out of /dist/commonjs.
  const rootDirName = path.join(__dirname, '..', '..');

  let dirNameNormalized = path.normalize(rootDirName);
  const appAsarPathPart = path.normalize(path.join('.', 'app.asar'));

  if (dirNameNormalized.includes('app.asar')) {
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

function getFullSqliteStoragePath(sqlitePath: string): string {

  if (sqlitePath) {
    return sqlitePath;
  }

  const userDataFolderPath = getUserConfigFolder();

  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

function getUserConfigFolder(): string {

  const userHomeDir = os.homedir();
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

  const configFilePath = path.resolve(process.env.CONFIG_PATH, env, 'process_engine', repositoryConfigFileName);

  const fileContent = fs.readFileSync(configFilePath, 'utf-8');

  const parsedFileContent = JSON.parse(fileContent) as Sequelize.Options;

  return parsedFileContent;
}
