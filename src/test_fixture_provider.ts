import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';
import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {
  ExecutionContext,
  IExecuteProcessService,
  IExecutionContextFacade,
  IExecutionContextFacadeFactory,
  IProcessModelService,
  Model,
} from '@process-engine/process_engine_contracts';

import {ConsumerContext, IConsumerApiService} from '@process-engine/consumer_api_contracts';

import {IIdentity} from '@essential-projects/iam_contracts';

const logger: Logger = Logger.createLogger('test:bootstrapper');

const iocModuleNames: Array<string> = [
  '@essential-projects/bootstrapper',
  '@essential-projects/bootstrapper_node',
  '@essential-projects/event_aggregator',
  '@essential-projects/services',
  '@essential-projects/timing',
  '@process-engine/consumer_api_core',
  '@process-engine/correlations.repository.sequelize',
  '@process-engine/flow_node_instance.repository.sequelize',
  '@process-engine/iam',
  '@process-engine/process_engine_core',
  '@process-engine/process_model.repository.sequelize',
  '@process-engine/timers.repository.sequelize',
  '../../test',
];

const iocModules: Array<any> = iocModuleNames.map((moduleName: string): any => {
  return require(`${moduleName}/ioc_module`);
});

export class TestFixtureProvider {
  private _executeProcessService: IExecuteProcessService;
  private _executionContextFacade: IExecutionContextFacade;

  private container: InvocationContainer;
  private bootstrapper: AppBootstrapper;

  private _processModelService: IProcessModelService;

  private _consumerApiService: IConsumerApiService;
  private _consumerContext: ConsumerContext;

  public get executionContextFacade(): IExecutionContextFacade {
    return this._executionContextFacade;
  }

  public get consumerContext(): ConsumerContext {
    return this._consumerContext;
  }

  public get executeProcessService(): IExecuteProcessService {
    return this._executeProcessService;
  }

  public get consumerApiService(): IConsumerApiService {
    return this._consumerApiService;
  }

  public get processModelService(): IProcessModelService {
    return this._processModelService;
  }

  public async initializeAndStart(): Promise<void> {

    await this._initializeBootstrapper();

    await this.bootstrapper.start();

    this._createMockContexts();

    this._executeProcessService = await this.resolveAsync<IExecuteProcessService>('ExecuteProcessService');
    this._consumerApiService = await this.resolveAsync<IConsumerApiService>('ConsumerApiService');
    this._processModelService = await this.resolveAsync<IProcessModelService>('ProcessModelService');
  }

  public async tearDown(): Promise<void> {
    await this.bootstrapper.stop();
  }

  public async resolveAsync<T>(moduleName: string): Promise<any> {
    return this.container.resolveAsync<T>(moduleName);
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

  public async executeProcess(processKey: string, startEventKey: string, correlationId: string, initialToken: any = {}): Promise<any> {

    const processModel: Model.Types.Process = await this._getProcessById(processKey);

    return this
      .executeProcessService
      .startAndAwaitEndEvent(this.executionContextFacade, processModel, startEventKey, correlationId, initialToken);
  }

  /**
   * Generate an absoulte path, which points to the bpmn directory.
   *
   * Checks if the cwd is "_integration_tests". If not, that directory name is appended.
   * This is necessary, because Jenkins uses a different cwd than the local machines do.
   */
  public getBpmnDirectoryPath(): string {

    const bpmnDirectoryName: string = 'bpmn';
    let rootDirPath: string = process.cwd();

    return path.join(rootDirPath, bpmnDirectoryName);
  }

  private async _initializeBootstrapper(): Promise<void> {

    try {
      this.container = new InvocationContainer({
        defaults: {
          conventionCalls: ['initialize'],
        },
      });

      for (const iocModule of iocModules) {
        iocModule.registerInContainer(this.container);
      }

      this.container.validateDependencies();

      const appPath: string = path.resolve(__dirname);
      this.bootstrapper = await this.container.resolveAsync<AppBootstrapper>('AppBootstrapper', [appPath]);

      logger.info('Bootstrapper started.');
    } catch (error) {
      logger.error('Failed to start bootstrapper!', error);
      throw error;
    }
  }

  private async _createMockContexts(): Promise<void> {

    // Note: Since the iam service is mocked, it doesn't matter what kind of token is used here.
    // It only matters that one is present.
    const identity: IIdentity = {
      token: 'randomtoken',
    };

    this._consumerContext = <ConsumerContext> {
      identity: 'randomtoken',
    };

    const executionContext: ExecutionContext = new ExecutionContext(identity);

    const executionContextFacadeFactory: IExecutionContextFacadeFactory =
      await this.resolveAsync<IExecutionContextFacadeFactory>('ExecutionContextFacadeFactory');

    this._executionContextFacade = executionContextFacadeFactory.create(executionContext);
  }

  private async _registerProcess(processFileName: string): Promise<void> {
    const xml: string = this._readProcessModelFromFile(processFileName);
    await this.processModelService.persistProcessDefinitions(this.executionContextFacade, processFileName, xml, true);
  }

  private _readProcessModelFromFile(fileName: string): string {

    const bpmnFolderLocation: string = this.getBpmnDirectoryPath();
    const processModelPath: string = path.join(bpmnFolderLocation, `${fileName}.bpmn`);

    const processModelAsXml: string = fs.readFileSync(processModelPath, 'utf-8');

    return processModelAsXml;
  }

  private async _getProcessById(processId: string): Promise<Model.Types.Process> {

    const processModel: Model.Types.Process = await this.processModelService.getProcessModelById(this.executionContextFacade, processId);

    return processModel;
  }
}
