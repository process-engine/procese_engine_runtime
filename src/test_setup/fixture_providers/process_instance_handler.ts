import * as uuid from 'node-uuid';
import * as should from 'should';

import {EventReceivedCallback, IEventAggregator} from '@essential-projects/event_aggregator_contracts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/consumer_api_contracts';
import {ExternalTask, IExternalTaskRepository} from '@process-engine/external_task_api_contracts';
import {FlowNodeInstance, IFlowNodeInstanceService} from '@process-engine/flow_node_instance.contracts';

import {TestFixtureProvider} from './test_fixture_provider';

/**
 * This class handles the creation of ProcessInstances and allows a test to
 * wait until a process has reached a suspended FlowNodeInstance.
 *
 * It can also be used to retrieve or finish UserTasks.
 */
export class ProcessInstanceHandler {

  private testFixtureProvider: TestFixtureProvider;
  private eventAggregator: IEventAggregator;

  constructor(testFixtureProvider: TestFixtureProvider) {
    this.testFixtureProvider = testFixtureProvider;
    this.eventAggregator = this.testFixtureProvider.resolve<IEventAggregator>('EventAggregator');
  }

  public async startProcessInstanceAndReturnCorrelationId(
    processModelId: string,
    correlationId?: string,
    inputValues?: any,
    identity?: IIdentity,
  ): Promise<string> {

    const startEventId = 'StartEvent_1';
    const startCallbackType = DataModels.ProcessModels.StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload: DataModels.ProcessModels.ProcessStartRequestPayload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: inputValues || {},
    };

    const identityToUse = identity || this.testFixtureProvider.identities.defaultUser;

    const result = await this.testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(identityToUse, processModelId, payload, startCallbackType, startEventId);

    return result.correlationId;
  }

  public async startProcessInstanceAndReturnResult(
    processModelId: string,
    correlationId?: string,
    inputValues?: any,
    identity?: IIdentity,
  ): Promise<DataModels.ProcessModels.ProcessStartResponsePayload> {

    const startEventId = 'StartEvent_1';
    const startCallbackType = DataModels.ProcessModels.StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload: DataModels.ProcessModels.ProcessStartRequestPayload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: inputValues || {},
    };

    const identityToUse = identity || this.testFixtureProvider.identities.defaultUser;

    const result = await this.testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(identityToUse, processModelId, payload, startCallbackType, startEventId);

    return result;
  }

  public async waitForProcessInstanceToReachSuspendedTask(
    correlationId: string,
    processModelId?: string,
    expectedNumberOfWaitingTasks: number = 1,
  ): Promise<void> {

    const maxNumberOfRetries = 60;
    const delayBetweenRetriesInMs = 200;

    const flowNodeInstanceService: IFlowNodeInstanceService = this.testFixtureProvider.resolve<IFlowNodeInstanceService>('FlowNodeInstanceService');

    for (let i = 0; i < maxNumberOfRetries; i++) {

      await this.wait(delayBetweenRetriesInMs);

      let flowNodeInstances: Array<FlowNodeInstance> = await flowNodeInstanceService.querySuspendedByCorrelation(correlationId);

      if (processModelId) {
        flowNodeInstances = flowNodeInstances.filter((fni: FlowNodeInstance): boolean => {
          return fni.tokens[0].processModelId === processModelId;
        });
      }

      const enoughWaitingTasksFound: boolean = flowNodeInstances.length >= expectedNumberOfWaitingTasks;
      if (enoughWaitingTasksFound) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance likely failed to start!`);
  }

  public async waitForExternalTaskToBeCreated(topicName: string, maxTask: number = 100): Promise<void> {

    const maxNumberOfRetries = 60;
    const delayBetweenRetriesInMs = 200;

    const externalTaskRepository = this.testFixtureProvider.resolve<IExternalTaskRepository>('ExternalTaskRepository');

    for (let i = 0; i < maxNumberOfRetries; i++) {

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
   * @param   identity      The identity with which to get the EmptyActivity.
   * @param   correlationId The ID of the Correlation for which to get the EmptyActivities.
   * @returns               A list of waiting EmptyActivities.
   */
  public async getWaitingEmptyActivitiesForCorrelationId(
    identity: IIdentity,
    correlationId: string,
  ): Promise<DataModels.EmptyActivities.EmptyActivityList> {

    return this.testFixtureProvider
      .consumerApiClientService
      .getEmptyActivitiesForCorrelation(identity, correlationId);
  }

  /**
   * Returns all ManualTasks that are running with the given correlation id.
   *
   * @async
   * @param   identity      The identity with which to get the ManualTask.
   * @param   correlationId The ID of the Correlation for which to get the ManualTasks.
   * @returns               A list of waiting ManualTasks.
   */
  public async getWaitingManualTasksForCorrelationId(identity: IIdentity, correlationId: string): Promise<DataModels.ManualTasks.ManualTaskList> {

    return this.testFixtureProvider
      .consumerApiClientService
      .getManualTasksForCorrelation(identity, correlationId);
  }

  /**
   * Returns all user tasks that are running with the given correlation id.
   *
   * @async
   * @param   identity      The identity with which to get the UserTask.
   * @param   correlationId The ID of the Correlation for which to get the UserTasks.
   * @returns               A list of waiting UserTasks.
   */
  public async getWaitingUserTasksForCorrelationId(identity: IIdentity, correlationId: string): Promise<DataModels.UserTasks.UserTaskList> {

    return this.testFixtureProvider
      .consumerApiClientService
      .getUserTasksForCorrelation(identity, correlationId);
  }

  /**
   * Finishes an EmptyActivity.
   *
   * @async
   * @param   identity           The identity with which to finish the EmptyActivity.
   * @param   correlationId      The ID of the Correlation for which to finish
   *                             the EmptyActivity.
   * @param   processInstanceId  The ID of the ProcessModel for which to finish
   *                             the EmptyActivity.
   * @param   flowNodeInstanceID The ID of the EmptyActivity to finish.
   * @returns                    The result of the finishing operation.
   */
  public async finishEmptyActivityInCorrelation(
    identity: IIdentity,
    processModelId: string,
    correlationId: string,
    manualTaskId: string,
  ): Promise<void> {

    await this.testFixtureProvider
      .consumerApiClientService
      .finishEmptyActivity(identity, processModelId, correlationId, manualTaskId);
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
  public async finishManualTaskInCorrelation(
    identity: IIdentity,
    processInstanceId: string,
    correlationId: string,
    manualTaskInstanceId: string,
  ): Promise<void> {

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
  public async finishUserTaskInCorrelation(
    identity: IIdentity,
    correlationId: string,
    processInstanceId: string,
    userTaskInstanceId: string,
    userTaskInput: any,
  ): Promise<any> {

    const waitingUserTasks = await this.getWaitingUserTasksForCorrelationId(identity, correlationId);

    should(waitingUserTasks).have.property('userTasks');
    should(waitingUserTasks.userTasks.length).be.equal(1, 'The process should have one waiting user task');

    const waitingUserTask = waitingUserTasks.userTasks[0];

    should(waitingUserTask.flowNodeInstanceId).be.equal(userTaskInstanceId);

    const userTaskResult =
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
    const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`;
    this.eventAggregator.subscribeOnce(endMessageToWaitFor, resolveFunc);
  }

  public waitForProcessWithInstanceIdToEnd(processInstanceId: string, resolveFunc: EventReceivedCallback): void {
    const endMessageToWaitFor = `/processengine/process/${processInstanceId}/ended`;
    this.eventAggregator.subscribeOnce(endMessageToWaitFor, resolveFunc);
  }

  public async wait(delayTimeInMs: number): Promise<void> {
    await new Promise((resolve: Function): void => {
      setTimeout((): void => {
        resolve();
      }, delayTimeInMs);
    });
  }

}
