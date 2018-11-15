import {ForbiddenError} from '@essential-projects/errors_ts';
import {IIAMService, IIdentity} from '@essential-projects/iam_contracts';

export class IamServiceMock implements IIAMService {

  private _claimConfigs: any = {
      // Can access everything
      defaultUser: [
        'can_read_process_model',
        'can_delete_process_model',
        'can_write_process_model',
        'can_access_external_tasks',
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
  };

  public async ensureHasClaim(identity: IIdentity, claimName: string): Promise<void> {

    const identityName: string = identity.token;

    if (identityName === 'forbiddenUser') {
      throw new ForbiddenError('access denied');
    }

    const matchingUserConfig: Array<string> = this._claimConfigs[identityName];

    if (!matchingUserConfig) {
      throw new ForbiddenError('access denied');
    }

    const userHasClaim: boolean = matchingUserConfig.some((claim: string): boolean => {
      return claim === claimName;
    });

    if (!userHasClaim) {
      throw new ForbiddenError('access denied');
    }

    return Promise.resolve();
  }
}
