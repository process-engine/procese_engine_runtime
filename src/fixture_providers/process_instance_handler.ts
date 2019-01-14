'use strict';

import * as should from 'should';
import * as uuid from 'uuid';

import {EventReceivedCallback, IEventAggregator} from '@essential-projects/event_aggregator_contracts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {
  ManualTaskList,
  ProcessStartRequestPayload,
  ProcessStartResponsePayload,
  StartCallbackType,
  UserTask,
  UserTaskList,
} from '@process-engine/consumer_api_contracts';
import {ExternalTask, IExternalTaskRepository} from '@process-engine/external_task_api_contracts';
import {IFlowNodeInstanceService, Runtime} from '@process-engine/process_engine_contracts';

import {TestFixtureProvider} from './test_fixture_provider';

/**
 * This class handles the creation of ProcessInstances and allows a test to
 * wait until a process has reached a suspended FlowNodeInstance.
 *
 * It can also be used to retrieve or finish UserTasks.
 */
export class ProcessInstanceHandler {

  private _eventAggregator: IEventAggregator;
  private _testFixtureProvider: TestFixtureProvider;

  constructor(testFixtureProvider: TestFixtureProvider) {
    this._testFixtureProvider = testFixtureProvider;
  }

  private get eventAggregator(): IEventAggregator {
    if (!this._eventAggregator) {
      this._eventAggregator = this.testFixtureProvider.resolve<IEventAggregator>('EventAggregator');
    }

    return this._eventAggregator;
  }

  private get testFixtureProvider(): TestFixtureProvider {
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
      .startProcessInstance(this.testFixtureProvider.identities.defaultUser, processModelId, startEventId, payload, startCallbackType);

    return result.correlationId;
  }

  public async startProcessInstanceAndReturnResult(processModelId: string,
                                                   correlationId?: string,
                                                   inputValues?: any): Promise<ProcessStartResponsePayload> {

    const startEventId: string = 'StartEvent_1';
    const startCallbackType: StartCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload: ProcessStartRequestPayload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: inputValues || {},
    };

    const result: ProcessStartResponsePayload = await this.testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(this.testFixtureProvider.identities.defaultUser, processModelId, startEventId, payload, startCallbackType);

    return result;
  }

  public async waitForProcessInstanceToReachSuspendedTask(
    correlationId: string,
    processModelId?: string,
    expectedNumberOfWaitingTasks: number = 1,
  ): Promise<void> {

    const maxNumberOfRetries: number = 60;
    const delayBetweenRetriesInMs: number = 200;

    const flowNodeInstanceService: IFlowNodeInstanceService = this.testFixtureProvider.resolve<IFlowNodeInstanceService>('FlowNodeInstanceService');

    for (let i: number = 0; i < maxNumberOfRetries; i++) {

      await this.wait(delayBetweenRetriesInMs);

      let flowNodeInstances: Array<Runtime.Types.FlowNodeInstance> = await flowNodeInstanceService.querySuspendedByCorrelation(correlationId);

      if (processModelId) {
        flowNodeInstances = flowNodeInstances.filter((fni: Runtime.Types.FlowNodeInstance) => {
          return fni.tokens[0].processModelId === processModelId;
        });
      }

      if (flowNodeInstances.length >= expectedNumberOfWaitingTasks) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance likely failed to start!`);
  }

  public async waitForExternalTaskToBeCreated(topicName: string, maxTask: number = 100): Promise<void> {

    const maxNumberOfRetries: number = 60;
    const delayBetweenRetriesInMs: number = 200;

    const externalTaskRepository: IExternalTaskRepository = this.testFixtureProvider.resolve<IExternalTaskRepository>('ExternalTaskRepository');

    for (let i: number = 0; i < maxNumberOfRetries; i++) {

      await this.wait(delayBetweenRetriesInMs);

      const externalTasks: Array<ExternalTask<any>> = await externalTaskRepository.fetchAvailableForProcessing(topicName, maxTask);

      if (externalTasks.length >= 1) {
        return;
      }
    }

    throw new Error(`No ExternalTasks for topic '${topicName}' found! It is likely that creating the ExternalTask failed!`);
  }

  /**
   * Returns all user tasks that are running with the given correlation id.
   *
   * @async
   * @param   identity      The identity with which to get the UserTask.
   * @param   correlationId The ID of the Correlation for which to get the UserTasks.
   * @returns               A list of waiting UserTasks.
   */
  public async getWaitingUserTasksForCorrelationId(identity: IIdentity, correlationId: string): Promise<UserTaskList> {

    return this.testFixtureProvider
      .consumerApiClientService
      .getUserTasksForCorrelation(identity, correlationId);
  }

  /**
   * Returns all ManualTasks that are running with the given correlation id.
   *
   * @async
   * @param   identity      The identity with which to get the ManualTask.
   * @param   correlationId The ID of the Correlation for which to get the ManualTasks.
   * @returns               A list of waiting ManualTasks.
   */
  public async getWaitingManualTasksForCorrelationId(identity: IIdentity, correlationId: string): Promise<ManualTaskList> {

    return this.testFixtureProvider
      .consumerApiClientService
      .getManualTasksForCorrelation(identity, correlationId);
  }

  /**
   * Finishes a ManualTask.
   *
   * @async
   * @param   identity           The identity with which to finish the ManualTask.
   * @param   correlationId      The ID of the Correlation for which to finish
   *                             the ManualTask.
   * @param   processInstanceId  The ID of the ProcessModel for which to finish
   *                             the ManualTask.
   * @param   manualTaskInstanceId The ID of the ManualTask to finish.
   * @param   manualTaskInput      The input data with which to finish the ManualTask.
   * @returns                    The result of the finishing operation.
   */
  public async finishManualTaskInCorrelation(identity: IIdentity,
                                             processInstanceId: string,
                                             correlationId: string,
                                             manualTaskInstanceId: string): Promise<void> {

    await this.testFixtureProvider
       .consumerApiClientService
       .finishManualTask(identity, processInstanceId, correlationId, manualTaskInstanceId);
  }

  /**
   * Finishes a UserTask and returns its result.
   *
   * @async
   * @param   identity           The identity with which to finish the UserTask.
   * @param   correlationId      The ID of the Correlation for which to finish
   *                             the UserTask.
   * @param   processInstanceId  The ID of the ProcessModel for which to finish
   *                             the UserTask.
   * @param   userTaskInstanceId The ID of the UserTask to finish.
   * @param   userTaskInput      The input data with which to finish the UserTask.
   * @returns                    The result of the finishing operation.
   */
  public async finishUserTaskInCorrelation(identity: IIdentity,
                                           correlationId: string,
                                           processInstanceId: string,
                                           userTaskInstanceId: string,
                                           userTaskInput: any): Promise<any> {

    const waitingUserTasks: UserTaskList = await this.getWaitingUserTasksForCorrelationId(identity, correlationId);

    should(waitingUserTasks).have.property('userTasks');
    should(waitingUserTasks.userTasks.length).be.equal(1, 'The process should have one waiting user task');

    const waitingUserTask: UserTask = waitingUserTasks.userTasks[0];

    should(waitingUserTask.flowNodeInstanceId).be.equal(userTaskInstanceId);

    const userTaskResult: any =
      await this.testFixtureProvider
        .consumerApiClientService
        .finishUserTask(identity, processInstanceId, correlationId, userTaskInstanceId, userTaskInput);

    return userTaskResult;
  }

  /**
   * Creates a subscription on the EventAggregator, which will resolve, when
   * a ProcessInstance with a specific ProcessModelId within a Correlation is
   * finished.
   *
   * This was necessary, because of time gaps between resuming/finishing a suspended
   * FlowNodeInstance and the end of the ProcessInstance.
   * That gap could lead to a test finishing before the associated ProcessInstance
   * was actually finished, which in turn lead to messed up database entries.
   *
   * @param correlationId  The correlation in which the process runs.
   * @param processModelId The id of the process model to wait for.
   * @param resolveFunc    The function to call when the process was finished.
   */
  public waitForProcessInstanceToEnd(correlationId: string, processModelId: string, resolveFunc: EventReceivedCallback): void {
    const endMessageToWaitFor: string = `/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`;
    this.eventAggregator.subscribeOnce(endMessageToWaitFor, resolveFunc);
  }

  public waitForProcessByInstanceIdToEnd(processInstanceId: string, resolveFunc: EventReceivedCallback): void {
    const endMessageToWaitFor: string = `/processengine/process/${processInstanceId}/ended`;
    this.eventAggregator.subscribeOnce(endMessageToWaitFor, resolveFunc);
  }

  public async wait(delayTimeInMs: number): Promise<void> {
    await new Promise((resolve: Function): void => {
      setTimeout(() => {
        resolve();
      }, delayTimeInMs);
    });
  }

}
