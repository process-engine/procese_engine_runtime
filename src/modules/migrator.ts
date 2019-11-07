import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Umzug from 'umzug';

import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

import * as environment from './environment';

const sequelizeConnectionManager: SequelizeConnectionManager = new SequelizeConnectionManager();

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
export async function migrate(repositoryName: string, sqlitePath: string): Promise<void> {

  const env = process.env.NODE_ENV || 'sqlite';

  const sequelizeInstanceConfig = getConfig(env, repositoryName, sqlitePath);

  const sequelizeInstance = await sequelizeConnectionManager.getConnection(sequelizeInstanceConfig);

  const umzugInstance = await createUmzugInstance(sequelizeInstance, repositoryName, sequelizeInstanceConfig.dialect);
  await umzugInstance.up();

  await sequelizeConnectionManager.destroyConnection(sequelizeInstanceConfig);
}

function getConfig(env: string, repositoryName: string, sqlitePath?: string): Sequelize.Options {

  const repositoryConfigFileName = `${repositoryName}_repository.json`;
  const config = environment.readConfigFile(env, repositoryConfigFileName);

  if (config.dialect === 'sqlite') {
    const fullSqlitePath = environment.getSqliteStoragePath(sqlitePath);
    config.storage = path.resolve(fullSqlitePath, config.storage);
  }

  return config;
}

async function createUmzugInstance(sequelize: Sequelize.Sequelize, database: string, dbDialect: string): Promise<Umzug.Umzug> {

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
        dbDialect,
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
