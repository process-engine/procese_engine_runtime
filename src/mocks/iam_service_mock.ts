import {ForbiddenError} from '@essential-projects/errors_ts';
import {IIAMService, IIdentity} from '@essential-projects/iam_contracts';

export class IamServiceMock implements IIAMService {

  public async ensureHasClaim(identity: IIdentity, claimName: string): Promise<void> {

    const identityName: string = identity.token;

    if (identityName === 'forbiddenUser') {
      throw new ForbiddenError('access denied');
    }

    return Promise.resolve();
  }
}
