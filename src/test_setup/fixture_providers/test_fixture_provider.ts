/* eslint-disable @typescript-eslint/member-naming */
import {exec} from 'child_process';
import * as fs from 'fs';
import * as jsonwebtoken from 'jsonwebtoken';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity, TokenBody} from '@essential-projects/iam_contracts';

import {APIs, IConsumerApiClient} from '@process-engine/consumer_api_contracts';
import {IManagementApiClient} from '@process-engine/management_api_contracts';
import {IExecuteProcessService} from '@process-engine/process_engine_contracts';
import {IProcessModelUseCases} from '@process-engine/persistence_api.contracts';

import * as postMigrations from '../../post-migrations';
import {ExternalTaskSampleWorker} from '../test_services/external_task_sample_worker';
import {initializeBootstrapper} from './setup_ioc_container';
import {migrate as executeMigrations} from './test_migrator';

import {configureGlobalRoutes} from '../../modules/global_route_configurator';

const logger = Logger.createLogger('test:bootstrapper');

process.on('unhandledRejection', (err: Error): void => logger.error('Unhandled Rejection Error: ', err));

export type IdentityCollection = {[userName: string]: IIdentity};

export class TestFixtureProvider {

  private bootstrapper: AppBootstrapper;
  private container: InvocationContainer;

  private _consumerApiClient: IConsumerApiClient;
  private _executeProcessService: IExecuteProcessService;
  private _externalTaskApiClient: APIs.IExternalTaskConsumerApi;
  private _sampleExternalTaskWorker: ExternalTaskSampleWorker;
  private _managementApiClient: IManagementApiClient;
  private _processModelUseCases: IProcessModelUseCases;

  private _identities: IdentityCollection;

  private enableHttp: boolean;

  public get identities(): IdentityCollection {
    return this._identities;
  }

  public get consumerApiClient(): IConsumerApiClient {
    return this._consumerApiClient;
  }

  // DEPRECATED - This client, as well as the endpoints it accesses, will be removed in future versions.
  // For now, it is still tested, to ensure that ExternalTaskApiClients in use can still function.
  public get externalTaskApiClient(): APIs.IExternalTaskConsumerApi {
    return this._externalTaskApiClient;
  }

  public get managementApiClient(): IManagementApiClient {
    return this._managementApiClient;
  }

  public get executeProcessService(): IExecuteProcessService {
    return this._executeProcessService;
  }

  public get processModelUseCases(): IProcessModelUseCases {
    return this._processModelUseCases;
  }

  public async initializeAndStart(enableHttp: boolean = true, useHttpRootRoutes: boolean = true): Promise<void> {

    this.enableHttp = enableHttp;

    await this.runMigrations();
    await this.runPostMigrations();
    await this.initializeBootstrapper(enableHttp);
    await this.bootstrapper.start();

    this._sampleExternalTaskWorker = await this.resolveAsync<ExternalTaskSampleWorker>('ExternalTaskSampleWorker');

    if (enableHttp) {
      this._sampleExternalTaskWorker.start();
      await configureGlobalRoutes(this.container, useHttpRootRoutes);
    }

    await this.createMockIdentities();

    this._consumerApiClient = await this.resolveAsync<IConsumerApiClient>('ConsumerApiClient');
    this._externalTaskApiClient = await this.resolveAsync<APIs.IExternalTaskConsumerApi>('ExternalTaskApiClient');
    this._managementApiClient = await this.resolveAsync<IManagementApiClient>('ManagementApiClient');

    this._executeProcessService = await this.resolveAsync<IExecuteProcessService>('ExecuteProcessService');
    this._processModelUseCases = await this.resolveAsync<IProcessModelUseCases>('ProcessModelUseCases');
  }

  public async tearDown(): Promise<void> {

    if (this.enableHttp) {
      const httpExtension = await this.container.resolveAsync<any>('HttpExtension');
      await httpExtension.close();
    }

    this._sampleExternalTaskWorker.stop();

    await this.clearDatabases();
    await this.clearLogsAndMetrics();

    await this.bootstrapper.stop();
    this.container.clear();
  }

  public resolve<TModule>(moduleName: string, args?: any): TModule {
    return this.container.resolve<TModule>(moduleName, args);
  }

  public async resolveAsync<TModule>(moduleName: string, args?: any): Promise<TModule> {
    return this.container.resolveAsync<TModule>(moduleName, args);
  }

  public async importProcessFiles(processFileNames: Array<string>): Promise<void> {

    for (const processFileName of processFileNames) {
      await this.registerProcess(processFileName);
    }
  }

  public readProcessModelFile(processFileName: string): string {

    return this.readProcessModelFromFile(processFileName);
  }

  public getBpmnDirectoryPath(): string {

    const bpmnDirectoryName = 'bpmn';
    const rootDirPath = process.cwd();

    return path.join(rootDirPath, bpmnDirectoryName);
  }

  public async executeProcess(processModelId: string, startEventId: string, correlationId: string, initialToken: any = {}): Promise<any> {

    return this
      .executeProcessService
      .startAndAwaitEndEvent(this.identities.defaultUser, processModelId, correlationId, startEventId, initialToken);
  }

  public async clearDatabases(): Promise<void> {

    const processModels = await this.processModelUseCases.getProcessModels(this.identities.superAdmin);

    for (const processModel of processModels) {
      logger.info(`Removing ProcessModel ${processModel.id} and all related data`);
      await this.processModelUseCases.deleteProcessModel(this.identities.superAdmin, processModel.id);
    }
  }

  public async clearLogsAndMetrics(): Promise<void> {

    if (process.env.KEEP_TEST_LOGS) {
      return;
    }

    try {
      const pathToLogs = path.resolve(process.cwd(), 'test', 'logs', 'archive');
      const pathToMetrics = path.resolve(process.cwd(), 'test', 'metrics', 'archive');

      await this.execAsync(`rm -rf ${pathToLogs} ${pathToMetrics}`);
    } catch (error) {
      logger.warn(`Cannot remove archival folders: ${error.message}`);
    }
  }

  private async runMigrations(): Promise<void> {

    logger.info('Running migrations....');
    const repositories = [
      'correlation',
      'cronjob_history',
      'external_task',
      'flow_node_instance',
      'process_model',
    ];

    for (const repository of repositories) {
      await executeMigrations(repository);
    }

    logger.info('Migrations successfully finished!');
  }

  private async runPostMigrations(): Promise<void> {

    try {
      logger.info('Running post-migration scripts.');

      await postMigrations.runPostMigrationForV910();

      logger.info('Post-Migrations successfully executed.');
    } catch (error) {
      logger.error('Failed to run Post-Migrations', error);
      process.exit(1);
    }
  }

  private async initializeBootstrapper(httpIsEnabled: boolean): Promise<void> {

    try {
      this.container = await initializeBootstrapper(httpIsEnabled);

      const appPath = path.resolve(__dirname);
      this.bootstrapper = await this.container.resolveAsync<AppBootstrapper>('AppBootstrapper', [appPath]);

      logger.info('Bootstrapper started.');
    } catch (error) {
      logger.error('Failed to start bootstrapper!', error);
      throw error;
    }
  }

  private async createMockIdentities(): Promise<void> {

    this._identities = {
      // all access user
      defaultUser: await this.createIdentity('defaultUser'),
      secondDefaultUser: await this.createIdentity('secondDefaultUser'),
      // no access user
      restrictedUser: await this.createIdentity('restrictedUser'),
      // partially restricted users
      userWithAccessToSubLaneC: await this.createIdentity('userWithAccessToSubLaneC'),
      userWithAccessToLaneA: await this.createIdentity('userWithAccessToLaneA'),
      userWithNoAccessToLaneA: await this.createIdentity('userWithNoAccessToLaneA'),
      superAdmin: await this.createIdentity('superAdmin'),
    };
  }

  private async createIdentity(userId: string): Promise<IIdentity> {

    const tokenBody: TokenBody = {
      sub: userId,
      name: 'hellas',
    };

    const signOptions: jsonwebtoken.SignOptions = {
      expiresIn: 60,
    };

    const encodedToken = jsonwebtoken.sign(tokenBody, 'randomkey', signOptions);

    return {
      token: encodedToken,
      userId: userId,
    };
  }

  private async registerProcess(processFileName: string): Promise<void> {
    const xml = this.readProcessModelFromFile(processFileName);
    await this.processModelUseCases.persistProcessDefinitions(this.identities.defaultUser, processFileName, xml, true);
  }

  private readProcessModelFromFile(fileName: string): string {

    const bpmnDirectoryPath = this.getBpmnDirectoryPath();
    const processModelPath = path.join(bpmnDirectoryPath, `${fileName}.bpmn`);

    const processModelAsXml = fs.readFileSync(processModelPath, 'utf-8');

    return processModelAsXml;
  }

  private async execAsync(command): Promise<string> {

    return new Promise((resolve, reject): void => {
      const childProcess = exec(command, (error, stdout): void => {

        if (error) {
          return reject(error);
        }

        return resolve(stdout);
      });

      childProcess.stdout.on('data', (data): void => logger.verbose(data));
      childProcess.stderr.on('data', (data): void => logger.error(data));
    });
  }

}
