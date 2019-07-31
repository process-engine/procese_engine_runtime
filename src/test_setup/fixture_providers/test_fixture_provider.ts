/* eslint-disable @typescript-eslint/member-naming */
import * as fs from 'fs';
import * as jsonwebtoken from 'jsonwebtoken';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity, TokenBody} from '@essential-projects/iam_contracts';

import {IConsumerApiClient} from '@process-engine/consumer_api_contracts';
import {IDeploymentApi} from '@process-engine/deployment_api_contracts';
import {IExternalTaskApi} from '@process-engine/external_task_api_contracts';
import {ExternalTaskSampleWorker} from '@process-engine/external_task_sample_worker';
import {IManagementApi} from '@process-engine/management_api_contracts';
import {IExecuteProcessService} from '@process-engine/process_engine_contracts';
import {IProcessModelUseCases} from '@process-engine/process_model.contracts';

import {initializeBootstrapper} from './setup_ioc_container';
import {migrate as executeMigrations} from './test_migrator';

import {configureGlobalRoutes} from '../../global_route_configurator';

const logger: Logger = Logger.createLogger('test:bootstrapper');

export type IdentityCollection = {[userName: string]: IIdentity};

export class TestFixtureProvider {

  private bootstrapper: AppBootstrapper;
  private container: InvocationContainer;

  private _consumerApiClient: IConsumerApiClient;
  private _deploymentApiService: IDeploymentApi;
  private _executeProcessService: IExecuteProcessService;
  private _externalTaskApiClient: IExternalTaskApi;
  private _sampleExternalTaskWorker: ExternalTaskSampleWorker;
  private _managementApiClient: IManagementApi;
  private _processModelUseCases: IProcessModelUseCases;

  private _identities: IdentityCollection;

  public get identities(): IdentityCollection {
    return this._identities;
  }

  public get consumerApiClient(): IConsumerApiClient {
    return this._consumerApiClient;
  }

  public get externalTaskApiClient(): IExternalTaskApi {
    return this._externalTaskApiClient;
  }

  public get managementApiClient(): IManagementApi {
    return this._managementApiClient;
  }

  public get deploymentApiService(): IDeploymentApi {
    return this._deploymentApiService;
  }

  public get executeProcessService(): IExecuteProcessService {
    return this._executeProcessService;
  }

  public get processModelUseCases(): IProcessModelUseCases {
    return this._processModelUseCases;
  }

  public async initializeAndStart(): Promise<void> {

    await this.runMigrations();
    await this.initializeBootstrapper();
    await this.bootstrapper.start();
    await configureGlobalRoutes(this.container);

    await this.createMockIdentities();

    this._consumerApiClient = await this.resolveAsync<IConsumerApiClient>('ConsumerApiClient');
    this._externalTaskApiClient = await this.resolveAsync<IExternalTaskApi>('ExternalTaskApiClient');
    this._managementApiClient = await this.resolveAsync<IManagementApi>('ManagementApiClient');

    this._deploymentApiService = await this.resolveAsync<IDeploymentApi>('DeploymentApiService');
    this._executeProcessService = await this.resolveAsync<IExecuteProcessService>('ExecuteProcessService');
    this._processModelUseCases = await this.resolveAsync<IProcessModelUseCases>('ProcessModelUseCases');

    this._sampleExternalTaskWorker = await this.resolveAsync<ExternalTaskSampleWorker>('ExternalTaskSampleWorker');
    this._sampleExternalTaskWorker.start();
  }

  public async tearDown(): Promise<void> {
    this._sampleExternalTaskWorker.stop();
    const httpExtension: any = await this.container.resolveAsync('HttpExtension');
    await httpExtension.close();
    await this.bootstrapper.stop();
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

    const bpmnFolderPath: string = this.getBpmnDirectoryPath();
    const fullFilePath: string = path.join(bpmnFolderPath, `${processFileName}.bpmn`);

    const fileContent: string = fs.readFileSync(fullFilePath, 'utf-8');

    return fileContent;
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

  private async initializeBootstrapper(): Promise<void> {

    try {
      this.container = await initializeBootstrapper();

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

    const encodedToken: string = jsonwebtoken.sign(tokenBody, 'randomkey', signOptions);

    return {
      token: encodedToken,
      userId: userId,
    };
  }

  private async registerProcess(processFileName: string): Promise<void> {

    const bpmnDirectoryPath: string = this.getBpmnDirectoryPath();
    const processFilePath: string = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    const processName: string = path.parse(processFileName).name;

    await this.deploymentApiService.importBpmnFromFile(this.identities.defaultUser, processFilePath, processName, true);
  }

}
