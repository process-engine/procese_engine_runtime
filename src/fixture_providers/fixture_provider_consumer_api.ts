import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';
const logger: Logger = Logger.createLogger('test:bootstrapper');

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';

import {ConsumerContext, IConsumerApiService} from '@process-engine/consumer_api_contracts';
import {
  ExecutionContext,
  IExecutionContextFacade,
  IExecutionContextFacadeFactory,
  IProcessModelService,
} from '@process-engine/process_engine_contracts';

import {initializeBootstrapper} from './setup_ioc_container';

export class FixtureProviderConsumerApi {
  private bootstrapper: AppBootstrapper;

  private _consumerApiClientService: IConsumerApiService;
  private _processModelService: IProcessModelService;

  private container: InvocationContainer;

  private _consumerContexts: {[name: string]: ConsumerContext} = {};

  public get context(): {[name: string]: ConsumerContext} {
    return this._consumerContexts;
  }

  public get consumerApiClientService(): IConsumerApiService {
    return this._consumerApiClientService;
  }

  public get processModelService(): IProcessModelService {
    return this._processModelService;
  }

  public async initializeAndStart(): Promise<void> {
    await this._initializeBootstrapper();
    await this.bootstrapper.start();
    await this._createConsumerContextForUsers();
    this._consumerApiClientService = await this.resolveAsync<IConsumerApiService>('ConsumerApiClientService');
    this._processModelService = await this.resolveAsync<IProcessModelService>('ProcessModelService');
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

  private async _createConsumerContextForUsers(): Promise<void> {

    // all access user
    this._consumerContexts.defaultUser = await this._createConsumerContext('defaultUser');
    // no access user
    this._consumerContexts.restrictedUser = await this._createConsumerContext('restrictedUser');
    // partially restricted users
    this._consumerContexts.userWithAccessToSubLaneC = await this._createConsumerContext('userWithAccessToSubLaneC');
    this._consumerContexts.userWithAccessToLaneA = await this._createConsumerContext('userWithAccessToLaneA');
    this._consumerContexts.userWithNoAccessToLaneA = await this._createConsumerContext('userWithNoAccessToLaneA');
  }

  private async _createConsumerContext(username: string): Promise<ConsumerContext> {

    // Note: Since the iam facade is mocked, it doesn't matter what kind of token is used here.
    // It only matters that one is present.
    return <ConsumerContext> {
      identity: username,
    };
  }

  public async importProcessFiles(processFileNames: Array<string>): Promise<void> {

    for (const processFileName of processFileNames) {
      await this._registerProcess(processFileName);
    }
  }

  private async _registerProcess(processFileName: string): Promise<void> {

    const dummyIdentity: IIdentity = {
      token: 'defaultUser',
    };

    const executionContext: ExecutionContext = new ExecutionContext(dummyIdentity);

    const executionContextFacadeFactory: IExecutionContextFacadeFactory =
      await this.resolveAsync<IExecutionContextFacadeFactory>('ExecutionContextFacadeFactory');

    const executionContextFacade: IExecutionContextFacade = executionContextFacadeFactory.create(executionContext);

    const xml: string = this._readProcessModelFromFile(processFileName);
    await this.processModelService.persistProcessDefinitions(executionContextFacade, processFileName, xml, true);
  }

  private _readProcessModelFromFile(fileName: string): string {

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
