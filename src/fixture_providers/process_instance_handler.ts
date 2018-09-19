'use strict';

import * as uuid from 'uuid';

import {
  ProcessStartRequestPayload,
  ProcessStartResponsePayload,
  StartCallbackType,
} from '@process-engine/consumer_api_contracts';
import {IFlowNodeInstanceService} from '@process-engine/process_engine_contracts';

/**
 * This class handles the creation of process instances and waits for a process instance to reach a user task.
 *
 * Only to be used in conjunction with the user task tests.
 */
export class ProcessInstanceHandler {

  private _testFixtureProvider: any;

  constructor(testFixtureProvider: any) {
    this._testFixtureProvider = testFixtureProvider;
  }

  private get testFixtureProvider(): any {
    return this._testFixtureProvider;
  }

  public async startProcessInstanceAndReturnCorrelationId(processModelId: string, correlationId?: string, inputValues?: any): Promise<string> {

    const startEventId: string = 'StartEvent_1';
    const startCallbackType: StartCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload: ProcessStartRequestPayload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: inputValues || {},
    };

    const result: ProcessStartResponsePayload = await this.testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(this.testFixtureProvider.context.defaultUser, processModelId, startEventId, payload, startCallbackType);

    return result.correlationId;
  }

  public async waitForProcessInstanceToReachUserTask(correlationId: string): Promise<void> {

    const maxNumberOfRetries: number = 20;
    const delayBetweenRetriesInMs: number = 500;

    const flowNodeInstanceService: IFlowNodeInstanceService = await this.testFixtureProvider.resolveAsync('FlowNodeInstanceService');

    for (let i: number = 0; i < maxNumberOfRetries; i++) {

      await this.wait(delayBetweenRetriesInMs);

      const flowNodeInstances: Array<any> =
        await flowNodeInstanceService.querySuspendedByCorrelation(correlationId);

      if (flowNodeInstances && flowNodeInstances.length >= 1) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance like failed to start!`);
  }

  public async wait(delayTimeInMs: number): Promise<void> {
    await new Promise((resolve: Function): void => {
      setTimeout(() => {
        resolve();
      }, delayTimeInMs);
    });
  }

}
