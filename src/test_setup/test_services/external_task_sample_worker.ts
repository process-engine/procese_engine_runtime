/* eslint-disable @typescript-eslint/no-explicit-any */
import * as jsonwebtoken from 'jsonwebtoken';

import {Logger} from 'loggerhythm';

import {IIdentity, IIdentityService, TokenBody} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/consumer_api_contracts';
import {ExternalTaskWorker} from '@process-engine/consumer_api_client';

const logger = Logger.createLogger('processengine:external_task:sample_worker');

interface IWorkerConfig {
  workerId: string;
  topicName: string;
  pollingInterval: number;
  maxTasks: number;
  longPollingTimeout: number;
  lockDuration: number;
  processEngineUrl: string;
}

/**
 * Wraps an ExternalTaskWorker with a sample config and identity for easy use with the integrationtests.
 */
export class ExternalTaskSampleWorker {

  public config: IWorkerConfig;

  private identityService: IIdentityService;
  private sampleIdentity: IIdentity;
  private externalTaskWorker: ExternalTaskWorker<any, any>;

  constructor(identityService: IIdentityService) {
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

    this.externalTaskWorker = new ExternalTaskWorker(
      this.config.processEngineUrl,
      this.sampleIdentity,
      this.config.topicName,
      this.config.maxTasks,
      this.config.longPollingTimeout,
      this.processExternalTask,
    );
  }

  public start<TPayload, TResult>(): void {
    this.externalTaskWorker.start();
  }

  public stop(): void {
    this.externalTaskWorker.stop();
  }

  private async processExternalTask(externalTask: DataModels.ExternalTask.ExternalTask<any>): Promise<any> {

    logger.info(`Processing ExternalTask ${externalTask.id}.`);

    const sampleResult = {
      testResults: externalTask.payload,
    };

    logger.info(`Finished processing ExternalTask with ID ${externalTask.id}.`);

    return new DataModels.ExternalTask.ExternalTaskSuccessResult(externalTask.id, sampleResult);
  }

}
