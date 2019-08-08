import * as jsonwebtoken from 'jsonwebtoken';

import * as bluebird from 'bluebird';
import {Logger} from 'loggerhythm';

import {IIdentity, IIdentityService, TokenBody} from '@essential-projects/iam_contracts';

import {ExternalTask, IExternalTaskApi} from '@process-engine/external_task_api_contracts';

const logger = Logger.createLogger('processengine:external_task:sample_worker');

/**
 * Contains a sample implementation for an ExternalTask worker.
 * Use only for the Integrationtests.
 */
export class ExternalTaskSampleWorker {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public config: any;

  private externalTaskApiClient: IExternalTaskApi;
  private identityService: IIdentityService;

  private intervalTimer: NodeJS.Timeout;

  private sampleIdentity: IIdentity;

  constructor(externalTaskApiClient: IExternalTaskApi, identityService: IIdentityService) {
    this.externalTaskApiClient = externalTaskApiClient;
    this.identityService = identityService;
  }

  public async initialize(): Promise<void> {

    const tokenBody: TokenBody = {
      sub: this.config.workerId || 'dummy_token',
      name: 'sample_worker',
    };

    const signOptions: jsonwebtoken.SignOptions = {
      expiresIn: 60,
    };

    const encodedToken = jsonwebtoken.sign(tokenBody, 'randomkey', signOptions);

    this.sampleIdentity = await this.identityService.getIdentity(encodedToken);
  }

  public start<TPayload, TResult>(): void {
    this.intervalTimer = setInterval(async (): Promise<void> => {
      await this.fetchAndProcessExternalTasks<TPayload, TResult>();
    }, this.config.pollingInterval);
  }

  public stop(): void {
    clearInterval(this.intervalTimer);
  }

  private async fetchAndProcessExternalTasks<TPayload, TResult>(): Promise<void> {

    const availableExternalTasks = await this.externalTaskApiClient.fetchAndLockExternalTasks<TPayload>(
      this.sampleIdentity,
      this.config.workerId,
      this.config.topicName,
      this.config.maxTasks,
      this.config.longPollingTimeout,
      this.config.lockDuration,
    );

    if (availableExternalTasks.length > 0) {
      logger.info(`Found ${availableExternalTasks.length} ExternalTasks available for processing.`);

      this.stop();

      await bluebird.each(availableExternalTasks, async (externalTask: ExternalTask<TPayload>): Promise<void> => {
        return this.processExternalTask<TPayload, TResult>(externalTask);
      });

      logger.info('All tasks processed.');
      this.start();
    }
  }

  private async processExternalTask<TPayload, TResult>(externalTask: ExternalTask<TPayload>): Promise<void> {

    logger.info(`Processing ExternalTask ${externalTask.id}.`);

    const result = await this.getSampleResult<TPayload>(externalTask.payload);

    await this.externalTaskApiClient.finishExternalTask<TResult>(this.sampleIdentity, this.config.workerId, externalTask.id, result);

    logger.info(`Finished processing ExternalTask with ID ${externalTask.id}.`);

  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getSampleResult<TPayload>(payload: TPayload): any {

    const sampleResult = {
      testResults: payload,
    };

    return sampleResult;
  }

}
