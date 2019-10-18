import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Umzug from 'umzug';

import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

import * as environment from './environment';

const sequelizeConnectionManager: SequelizeConnectionManager = new SequelizeConnectionManager();

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
export async function migrate(repositoryName: string, sqlitePath: string): Promise<void> {

  const env = process.env.NODE_ENV || 'sqlite';

  const fullSqlitePath = environment.getSqliteStoragePath(sqlitePath);

  const repositoryConfigFileName = `${repositoryName}_repository.json`;

  let sequelizeInstanceConfig: Sequelize.Options;

  switch (env) {
    case 'test-mysql':
    case 'mysql':
      sequelizeInstanceConfig = getMysqlConfig(repositoryConfigFileName);
      break;
    case 'test-postgres':
    case 'postgres':
      sequelizeInstanceConfig = getPostgresConfig(repositoryConfigFileName);
      break;
    case 'test-sqlite':
    case 'sqlite':
      sequelizeInstanceConfig = getSQLiteConfig(fullSqlitePath, repositoryConfigFileName);
      break;
    default:
      sequelizeInstanceConfig = environment.readConfigFile(env, repositoryConfigFileName);
  }

  const sequelizeInstance = await sequelizeConnectionManager.getConnection(sequelizeInstanceConfig);

  const umzugInstance = await createUmzugInstance(sequelizeInstance, repositoryName);
  await umzugInstance.up();

  await sequelizeConnectionManager.destroyConnection(sequelizeInstanceConfig);
}

function getMysqlConfig(configFileName: string): object {
  return environment.readConfigFile('mysql', configFileName);
}

function getPostgresConfig(configFileName: string): object {
  return environment.readConfigFile('postgres', configFileName);
}

function getSQLiteConfig(sqlitePath: string, configFileName: string): object {

  const sqliteConfig = environment.readConfigFile('sqlite', configFileName);

  const databaseFullPath = path.resolve(sqlitePath, sqliteConfig.storage);

  sqliteConfig.storage = `${databaseFullPath}`;

  return sqliteConfig;
}

async function createUmzugInstance(sequelize: Sequelize.Sequelize, database: string): Promise<Umzug.Umzug> {

  // Must go two folders back to get out of /dist/commonjs.
  const rootDirName = path.join(__dirname, '..', '..', '..');

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
    logging: (args: unknown): void => {
      console.log(args);
    },
  });

  return umzug;
}
