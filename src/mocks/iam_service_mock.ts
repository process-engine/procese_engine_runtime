import {IIAMService, IIdentity} from '@essential-projects/iam_contracts';

export class IamServiceMock implements IIAMService {

  public async ensureHasClaim(identity: IIdentity, claimName: string): Promise<void> {
    return Promise.resolve();
  }
}
