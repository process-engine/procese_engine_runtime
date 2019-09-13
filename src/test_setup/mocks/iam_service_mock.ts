import {ForbiddenError} from '@essential-projects/errors_ts';
import {IIAMService, IIdentity} from '@essential-projects/iam_contracts';

export class IamServiceMock implements IIAMService {

  private claimConfigs: {[username: string]: Array<string>} = {
    // Can access everything
    defaultUser: [
      'can_read_process_model',
      'can_delete_process_model',
      'can_write_process_model',
      'can_access_external_tasks',
      'can_subscribe_to_events',
      'can_terminate_process',
      'can_trigger_messages',
      'can_trigger_signals',
      'can_read_cronjob_history',
      'Default_Test_Lane',
      'LaneA',
      'LaneB',
      'LaneC',
    ],

    secondDefaultUser: [
      'can_read_process_model',
      'can_delete_process_model',
      'can_write_process_model',
      'can_access_external_tasks',
      'can_subscribe_to_events',
      'can_trigger_messages',
      'can_trigger_signals',
      'can_read_cronjob_history',
      'Default_Test_Lane',
      'LaneA',
      'LaneB',
      'LaneC',
    ],
    // Used for testing the process model filter
    restrictedUser: [
      'can_read_process_model',
    ],
    // Sublane Testuser
    userWithAccessToSubLaneC: [
      'can_read_process_model',
      'LaneA',
      'LaneC',
    ],
    // Sublane Testuser
    userWithAccessToLaneA: [
      'can_read_process_model',
      'LaneA',
    ],
    // Sublane Testuser
    userWithNoAccessToLaneA: [
      'can_read_process_model',
      'LaneB',
      'LaneC',
    ],
    // Super Admin - Can see all ProcessModels, Tasks and Correlations
    superAdmin: [
      'can_manage_process_instances',
    ],
  };

  public async ensureHasClaim(identity: IIdentity, claimName: string): Promise<void> {

    const isDummyToken = identity.userId === 'dummy_token';
    const isSuperAdmin = identity.userId === 'superAdmin';
    if (isDummyToken || isSuperAdmin) {
      return Promise.resolve();
    }

    if (identity.userId === 'forbiddenUser') {
      throw new ForbiddenError('access denied');
    }

    const matchingUserConfig = this.claimConfigs[identity.userId];
    if (!matchingUserConfig) {
      throw new ForbiddenError('access denied');
    }

    const userHasClaim = matchingUserConfig.some((claim: string): boolean => {
      return claim === claimName;
    });

    if (!userHasClaim) {
      throw new ForbiddenError('access denied');
    }

    return Promise.resolve();
  }

}
