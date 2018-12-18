'use strict';

import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Umzug from 'umzug';

import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

const sequelizeConnectionManager: SequelizeConnectionManager = new SequelizeConnectionManager();

// Based on: https://github.com/abelnation/sequelize-migration-hello/blob/master/migrate.js
export async function migrate(database: string): Promise<void> {

  const sqliteConfig: any = await createSqLiteConfig(database);

  const sequelizeInstance: Sequelize.Sequelize = await sequelizeConnectionManager.getConnection(sqliteConfig);

  const umzugInstance: Umzug.Umzug = await createUmzugInstance(sequelizeInstance, database);
  await umzugInstance.up();

  await sequelizeConnectionManager.destroyConnection(sqliteConfig);
}

function createSqLiteConfig(store: string): any {

  // Jenkins stores its sqlite databases in a separate workspace folder.
  // We must account for this here.
  const storagePath: string = process.env.jenkinsDbStoragePath
    ? `${process.env.jenkinsDbStoragePath}/${store}.sqlite`
    : `test/sqlite_repositories/${store}.sqlite`;

  const sqliteConfig: any = {
    username: null,
    password: null,
    database: null,
    host: null,
    port: null,
    dialect: 'sqlite',
    storage: storagePath,
    supportBigNumbers: true,
    resetPasswordRequestTimeToLive: 12,
    logging: false,
  };

  return sqliteConfig;
}

async function createUmzugInstance(sequelize: Sequelize.Sequelize, database: string): Promise<Umzug.Umzug> {

  let dirNameNormalized: string = path.normalize(process.cwd());
  const appAsarPathPart: string = path.normalize(path.join('.', 'app.asar'));

  if (dirNameNormalized.indexOf('app.asar') > -1) {
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
