import {Logger} from 'loggerhythm';

const logger: Logger = Logger.createLogger('parallel_gateway:parallel_gateway_test_service');

export class ParallelGatewayTestService {

  public async currentTokenTestPart1(): Promise<string> {
    const currentTokenValue = 'current token test value';
    logger.info(`Setting the expected token.current value to: ${currentTokenValue}`);

    return currentTokenValue;
  }

  public async currentTokenTestPart2(currentTokenValue: string): Promise<string> {
    logger.info(`currentTokenTestPart2 has received current token: ${currentTokenValue}`);

    return currentTokenValue;
  }

  public async longRunningFunction(): Promise<string> {
    const timeout = 1000;
    await this.wait(timeout);
    logger.info('longRunningFunction has finished');

    return 'longRunningFunction has finished';
  }

  public async veryLongRunningFunction(): Promise<string> {
    const timeout = 3000;
    await this.wait(timeout);
    logger.info('veryLongRunningFunction has finished');

    return 'veryLongRunningFunction has finished';

  }

  public async secondVeryLongRunningFunction(): Promise<string> {
    const timeout = 3000;
    await this.wait(timeout);
    logger.info('secondVeryLongRunningFunction has finished');

    return 'secondVeryLongRunningFunction has finished';
  }

  public async sequenceTestPart2UpdateToken(currentToken: string): Promise<string> {
    const timeout = 500;
    await this.wait(timeout);
    logger.info(`sequenceTestPart2UpdateToken has received current token: ${currentToken}`);
    const updatedToken = `UPDATED ${currentToken}`;
    logger.info(`updated token: ${updatedToken}`);

    return updatedToken;
  }

  public async sequenceTestPart3Delay(currentToken: string): Promise<string> {
    const timeout = 1700;
    await this.wait(timeout);
    logger.info('sequenceTestPart3Delay has finished');

    return currentToken;
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve: Function): void => {
      setTimeout((): void => {
        resolve();
      }, milliseconds);
    });
  }

}
