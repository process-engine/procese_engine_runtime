import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';
const logger: Logger = Logger.createLogger('test:bootstrapper');

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';

import {DeploymentContext, IDeploymentApiService} from '@process-engine/deployment_api_contracts';
import {ExecutionContext, IExecutionContextFacade, IExecutionContextFacadeFactory} from '@process-engine/process_engine_contracts';

import {initializeBootstrapper} from './setup_bootstrapper';

export class FixtureProviderDeploymentApi {
  private bootstrapper: AppBootstrapper;
  private _deploymentApiService: IDeploymentApiService;

  private container: InvocationContainer;

  private _deploymentContextDefault: DeploymentContext = undefined;
  private _deploymentContextForbidden: DeploymentContext = undefined;

  public get context(): DeploymentContext {
    return this._deploymentContextDefault;
  }

  public get contextForbidden(): DeploymentContext {
    return this._deploymentContextForbidden;
  }

  public get deploymentApiService(): IDeploymentApiService {
    return this._deploymentApiService;
  }

  public async initializeAndStart(): Promise<void> {

    await this._initializeBootstrapper();

    await this.bootstrapper.start();

    await this._createContexts();

    this._deploymentApiService = await this.resolveAsync<IDeploymentApiService>('DeploymentApiService');
  }

  public async tearDown(): Promise<void> {
    const httpExtension: any = await this.container.resolveAsync('HttpExtension');
    await httpExtension.close();
  }

  public async resolveAsync<T>(moduleName: string, args?: any): Promise<any> {
    return this.container.resolveAsync<T>(moduleName, args);
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

  private async _createContexts(): Promise<void> {

    // Note: Since the iam service is mocked, it doesn't matter what kind of token is used here.
    // It only matters that one is present.
    this._deploymentContextDefault = <DeploymentContext> {
      identity: 'deploymentApiIntegrationtestUser',
    };

    this._deploymentContextForbidden = <DeploymentContext> {
      identity: 'forbiddenUser',
    };
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

  public readProcessModelFromFile(fileName: string): string {

    const bpmnFolderLocation: string = this.getBpmnDirectoryPath();
    const processModelPath: string = path.join(bpmnFolderLocation, `${fileName}.bpmn`);

    const processModelAsXml: string = fs.readFileSync(processModelPath, 'utf-8');

    return processModelAsXml;
  }

  public getBpmnDirectoryPath(): string {

    const bpmnDirectoryName: string = 'bpmn';
    let rootDirPath: string = process.cwd();

    return path.join(rootDirPath, bpmnDirectoryName);
  }
}
