import * as fs from 'fs';
import * as jsonwebtoken from 'jsonwebtoken';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';
const logger: Logger = Logger.createLogger('test:bootstrapper');

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity, TokenBody} from '@essential-projects/iam_contracts';

import {IConsumerApi} from '@process-engine/consumer_api_contracts';
import {IDeploymentApi} from '@process-engine/deployment_api_contracts';
import {IExternalTaskApi} from '@process-engine/external_task_api_contracts';
import {IManagementApi} from '@process-engine/management_api_contracts';
import {
  IExecuteProcessService,
  IProcessModelService,
  Model,
} from '@process-engine/process_engine_contracts';

import {migrate as executeMigrations} from './migrator';
import {initializeBootstrapper} from './setup_ioc_container';

import {configureGlobalRoutes} from './global_route_configurator';

export type IdentityCollection = {
  defaultUser: IIdentity;
  restrictedUser: IIdentity;
  userWithAccessToSubLaneC: IIdentity;
  userWithAccessToLaneA: IIdentity;
  userWithNoAccessToLaneA: IIdentity;
};

export class TestFixtureProvider {

  private bootstrapper: AppBootstrapper;
  private container: InvocationContainer;

  private _consumerApiClientService: IConsumerApi;
  private _deploymentApiService: IDeploymentApi;
  private _executeProcessService: IExecuteProcessService;
  private _externalTaskApiClientService: IExternalTaskApi;
  private _managementApiClientService: IManagementApi;
  private _processModelService: IProcessModelService;

  private _identities: IdentityCollection;

  public get identities(): IdentityCollection {
    return this._identities;
  }

  public get consumerApiClientService(): IConsumerApi {
    return this._consumerApiClientService;
  }

  public get deploymentApiService(): IDeploymentApi {
    return this._deploymentApiService;
  }

  public get executeProcessService(): IExecuteProcessService {
    return this._executeProcessService;
  }

  public get externalTaskApiClientService(): IExternalTaskApi {
    return this._externalTaskApiClientService;
  }

  public get managementApiClientService(): IManagementApi {
    return this._managementApiClientService;
  }

  public get processModelService(): IProcessModelService {
    return this._processModelService;
  }

  public async initializeAndStart(): Promise<void> {

    await this._runMigrations();
    await this._initializeBootstrapper();
    await this.bootstrapper.start();
    await configureGlobalRoutes(this.container);

    await this._createMockIdentities();

    this._consumerApiClientService = await this.resolveAsync<IConsumerApi>('ConsumerApiClientService');
    this._managementApiClientService = await this.resolveAsync<IManagementApi>('ManagementApiClientService');

    const accessApisExternally: boolean = process.env.API_ACCESS_TYPE === 'external';

    if (accessApisExternally) {
      (this._consumerApiClientService as any).consumerApiAccessor.initializeSocket(this.identities.defaultUser);
      (this._managementApiClientService as any).managementApiAccessor.initializeSocket(this.identities.defaultUser);
    }

    this._deploymentApiService = await this.resolveAsync<IDeploymentApi>('DeploymentApiService');
    this._executeProcessService = await this.resolveAsync<IExecuteProcessService>('ExecuteProcessService');
    this._externalTaskApiClientService = await this.resolveAsync<IExternalTaskApi>('ExternalTaskApiClientService');
    this._processModelService = await this.resolveAsync<IProcessModelService>('ProcessModelService');
  }

  public async tearDown(): Promise<void> {
    const httpExtension: any = await this.container.resolveAsync('HttpExtension');
    await httpExtension.close();
    await this.bootstrapper.stop();
  }

  public resolve<T>(moduleName: string, args?: any): T {
    return this.container.resolve<T>(moduleName, args);
  }

  public async resolveAsync<T>(moduleName: string, args?: any): Promise<T> {
    return this.container.resolveAsync<T>(moduleName, args);
  }

  public async importProcessFiles(processFileNames: Array<string>): Promise<void> {

    for (const processFileName of processFileNames) {
      await this._registerProcess(processFileName);
    }
  }

  public readProcessModelFile(processFileName: string): string {

    const bpmnFolderPath: string = this.getBpmnDirectoryPath();
    const fullFilePath: string = path.join(bpmnFolderPath, `${processFileName}.bpmn`);

    const fileContent: string = fs.readFileSync(fullFilePath, 'utf-8');

    return fileContent;
  }

  public getBpmnDirectoryPath(): string {

    const bpmnDirectoryName: string = 'bpmn';
    const rootDirPath: string = process.cwd();

    return path.join(rootDirPath, bpmnDirectoryName);
  }

  public async executeProcess(processModelId: string, startEventId: string, correlationId: string, initialToken: any = {}): Promise<any> {

    const processModel: Model.Types.Process = await this._getProcessById(processModelId);

    return this
      .executeProcessService
      .startAndAwaitEndEvent(this.identities.defaultUser, processModel, startEventId, correlationId, initialToken);
  }

  private async _runMigrations(): Promise<void> {

    logger.info('Running migrations....');
    const repositories: Array<string> = [
      'correlation',
      'external_task',
      'flow_node_instance',
      'process_model',
    ];

    for (const repository of repositories) {
      await executeMigrations(repository);
    }
    logger.info('Migrations successfully finished!');
  }

  private async _initializeBootstrapper(): Promise<void> {

    try {
      this.container = await initializeBootstrapper();

      const appPath: string = path.resolve(__dirname);
      this.bootstrapper = await this.container.resolveAsync<AppBootstrapper>('AppBootstrapper', [appPath]);

      logger.info('Bootstrapper started.');
    } catch (error) {
      logger.error('Failed to start bootstrapper!', error);
      throw error;
    }
  }

  private async _createMockIdentities(): Promise<void> {

    this._identities = {
      // all access user
      defaultUser: await this._createIdentity('defaultUser'),
      // no access user
      restrictedUser: await this._createIdentity('restrictedUser'),
      // partially restricted users
      userWithAccessToSubLaneC: await this._createIdentity('userWithAccessToSubLaneC'),
      userWithAccessToLaneA: await this._createIdentity('userWithAccessToLaneA'),
      userWithNoAccessToLaneA: await this._createIdentity('userWithNoAccessToLaneA'),
    };
  }

  private async _createIdentity(userId: string): Promise<IIdentity> {

    const tokenBody: TokenBody = {
      sub: userId,
      name: 'hellas',
    };

    const signOptions: jsonwebtoken.SignOptions = {
      expiresIn: 60,
    };

    const encodedToken: string = jsonwebtoken.sign(tokenBody, 'randomkey', signOptions);

    return <IIdentity> {
      token: encodedToken,
      userId: userId,
    };
  }

  private async _registerProcess(processFileName: string): Promise<void> {

    const bpmnDirectoryPath: string = this.getBpmnDirectoryPath();
    const processFilePath: string = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    const processName: string = path.parse(processFileName).name;

    await this.deploymentApiService.importBpmnFromFile(this.identities.defaultUser, processFilePath, processName, true);
  }

  private async _getProcessById(processId: string): Promise<Model.Types.Process> {

    const processModel: Model.Types.Process = await this.processModelService.getProcessModelById(this.identities.defaultUser, processId);

    return processModel;
  }
}
