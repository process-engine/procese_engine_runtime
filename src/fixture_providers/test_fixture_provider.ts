import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';
const logger: Logger = Logger.createLogger('test:bootstrapper');

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';

import {IConsumerApiService} from '@process-engine/consumer_api_contracts';
import {IDeploymentApiService} from '@process-engine/deployment_api_contracts';
import {IManagementApiService} from '@process-engine/management_api_contracts';
import {
  ExecutionContext,
  IExecuteProcessService,
  IExecutionContextFacade,
  IExecutionContextFacadeFactory,
  IProcessModelService,
  Model,
} from '@process-engine/process_engine_contracts';

import {initializeBootstrapper} from './setup_ioc_container';

export class TestFixtureProvider {

  private bootstrapper: AppBootstrapper;
  private container: InvocationContainer;

  private _consumerApiClientService: IConsumerApiService;
  private _deploymentApiService: IDeploymentApiService;
  private _executeProcessService: IExecuteProcessService;
  private _executionContextFacade: IExecutionContextFacade;
  private _managementApiClientService: IManagementApiService;
  private _processModelService: IProcessModelService;


  private _contexts: {[name: string]: any} = {};

  public get context(): {[name: string]: any} {
    return this._contexts;
  }

  public get consumerApiClientService(): IConsumerApiService {
    return this._consumerApiClientService;
  }

  public get deploymentApiService(): IDeploymentApiService {
    return this._deploymentApiService;
  }

  public get executeProcessService(): IExecuteProcessService {
    return this._executeProcessService;
  }

  public get executionContextFacade(): IExecutionContextFacade {
    return this._executionContextFacade;
  }

  public get managementApiClientService(): IManagementApiService {
    return this._managementApiClientService;
  }

  public get processModelService(): IProcessModelService {
    return this._processModelService;
  }

  public async initializeAndStart(): Promise<void> {

    await this._initializeBootstrapper();

    await this.bootstrapper.start();

    await this._createUserContexts();

    this._consumerApiClientService = await this.resolveAsync<IConsumerApiService>('ConsumerApiClientService');
    this._deploymentApiService = await this.resolveAsync<IDeploymentApiService>('DeploymentApiService');
    this._executeProcessService = await this.resolveAsync<IExecuteProcessService>('ExecuteProcessService');
    this._managementApiClientService = await this.resolveAsync<IManagementApiService>('ManagementApiClientService');
    this._processModelService = await this.resolveAsync<IProcessModelService>('ProcessModelService');
  }

  public async tearDown(): Promise<void> {
    const httpExtension: any = await this.container.resolveAsync('HttpExtension');
    await httpExtension.close();
    await this.bootstrapper.stop();
  }

  public async resolveAsync<T>(moduleName: string, args?: any): Promise<any> {
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
    let rootDirPath: string = process.cwd();

    return path.join(rootDirPath, bpmnDirectoryName);
  }

  public async executeProcess(processKey: string, startEventKey: string, correlationId: string, initialToken: any = {}): Promise<any> {

    const processModel: Model.Types.Process = await this._getProcessById(processKey);

    return this
      .executeProcessService
      .startAndAwaitEndEvent(this.executionContextFacade, processModel, startEventKey, correlationId, initialToken);
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

  private async _createUserContexts(): Promise<void> {

    // Contexts used by the APIs

    // all access user
    this._contexts.defaultUser = await this._createContext('defaultUser');
    // no access user
    this._contexts.restrictedUser = await this._createContext('restrictedUser');
    // partially restricted users
    this._contexts.userWithAccessToSubLaneC = await this._createContext('userWithAccessToSubLaneC');
    this._contexts.userWithAccessToLaneA = await this._createContext('userWithAccessToLaneA');
    this._contexts.userWithNoAccessToLaneA = await this._createContext('userWithNoAccessToLaneA');

    //ExecutionContextFacade for the ProcessEngine
    const executionContextFacadeFactory: IExecutionContextFacadeFactory =
      await this.resolveAsync<IExecutionContextFacadeFactory>('ExecutionContextFacadeFactory');

    const processEngineIdentity: any = {
      token: 'defaultUser',
    };

    const executionContext = new ExecutionContext(processEngineIdentity);

    this._executionContextFacade = executionContextFacadeFactory.create(executionContext);
  }

  private async _createContext(username: string): Promise<any> {

    // Note: Since the iam facade is mocked, it doesn't matter what type of token is used here.
    // It only matters that one is present.
    return {
      identity: username,
    };
  }

  private async _registerProcess(processFileName: string): Promise<void> {

    const bpmnDirectoryPath: string = this.getBpmnDirectoryPath();
    const processFilePath: string = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    const deploymentContext: any = {
      identity: 'defaultUser',
    };

    const processName: string = path.parse(processFileName).name;

    await this.deploymentApiService.importBpmnFromFile(deploymentContext, processFilePath, processName, true);
  }

  private async _getProcessById(processId: string): Promise<Model.Types.Process> {

    const processModel: Model.Types.Process = await this.processModelService.getProcessModelById(this.executionContextFacade, processId);

    return processModel;
  }
}
