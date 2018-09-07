import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';
import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';

import {DeploymentContext, IDeploymentApiService} from '@process-engine/deployment_api_contracts';
import {IManagementApiService, ManagementContext} from '@process-engine/management_api_contracts';
import {ExecutionContext, IExecutionContextFacade, IExecutionContextFacadeFactory} from '@process-engine/process_engine_contracts';

const logger: Logger = Logger.createLogger('test:bootstrapper');

import {initializeBootstrapper} from './setup_ioc_container';

export class FixtureProviderManagementApi {
  private bootstrapper: AppBootstrapper;
  private _deploymentApiService: IDeploymentApiService;
  private _managementApiClientService: IManagementApiService;

  private container: InvocationContainer;

  private _managementContext: ManagementContext = undefined;

  public get context(): ManagementContext {
    return this._managementContext;
  }

  private get deploymentApiService(): IDeploymentApiService {
    return this._deploymentApiService;
  }

  public get managementApiClientService(): IManagementApiService {
    return this._managementApiClientService;
  }

  public async initializeAndStart(): Promise<void> {

    await this._initializeBootstrapper();

    await this.bootstrapper.start();

    this._createMockContext();

    this._managementApiClientService = await this.resolveAsync<IManagementApiService>('ManagementApiClientService');
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

    this._deploymentApiService = await this.resolveAsync<IDeploymentApiService>('DeploymentApiService');

    for (const processFileName of processFileNames) {
      await this._registerProcess(processFileName);
    }
  }

  public readProcessModelFromFile(fileName: string): string {

    const bpmnFolderLocation: string = this.getBpmnDirectoryPath();
    const processModelPath: string = path.join(bpmnFolderLocation, `${fileName}.bpmn`);

    const processModelAsXml: string = fs.readFileSync(processModelPath, 'utf-8');

    return processModelAsXml;
  }

  public async createExecutionContextFacadeForContext(context: DeploymentContext): Promise<IExecutionContextFacade> {

    const identity: IIdentity = {
      token: context.identity,
    };

    const executionContext: ExecutionContext = new ExecutionContext(identity);

    const executionContextFacadeFactory: IExecutionContextFacadeFactory =
      await this.resolveAsync<IExecutionContextFacadeFactory>('ExecutionContextFacadeFactory');

    return executionContextFacadeFactory.create(executionContext);
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

  private _createMockContext(): void {
    // Note: Since the iam service is mocked, it doesn't matter what kind of token is used here.
    // It only matters that one is present.
    this._managementContext = <ManagementContext> {
      identity: 'defaultUser',
    };
  }

  private async _registerProcess(processFileName: string): Promise<void> {

    const bpmnDirectoryPath: string = this.getBpmnDirectoryPath();
    const processFilePath: string = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    const deploymentContext: DeploymentContext = {
      identity: 'defaultUser',
    };

    const processName: string = path.parse(processFileName).name;

    await this.deploymentApiService.importBpmnFromFile(deploymentContext, processFilePath, processName, true);
  }

  public getBpmnDirectoryPath(): string {

    const bpmnDirectoryName: string = 'bpmn';
    let rootDirPath: string = process.cwd();

    return path.join(rootDirPath, bpmnDirectoryName);
  }
}
