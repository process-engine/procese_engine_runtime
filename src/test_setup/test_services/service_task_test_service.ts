import {Logger} from 'loggerhythm';

const logger: Logger = Logger.createLogger('service_task:service_task_test_bnservice');

export class ServiceTaskTestService {

  public async returnOne(): Promise<number> {
    logger.info('Starting Service: Return One.');

    return 1;
  }

  public async returnObject(): Promise<any> {
    logger.info('Starting Service: Return Object');

    return {
      prop1: 1337,
      prop2: 'Hello World',
    };
  }

  public async echoParameter(message: string): Promise<string> {
    logger.info('Starting Service: Echo Parameter');

    return message;
  }

  public async addNumbers(firstNumber: number, secondNumber: number): Promise<number> {
    logger.info('Starting Service: Add Numbers');

    return firstNumber + secondNumber;
  }

  public async throwException(): Promise<void> {
    logger.info('Starting Service: Throw Exception');

    throw new Error('Failed');
  }

  public async delay(timeInSeconds: number, valueToReturn: any): Promise<any> {
    logger.info('Starting Service: Delay');
    logger.info(`Waiting ${timeInSeconds} seconds.`);

    const millisecondsToWait = timeInSeconds * 1000;

    await new Promise((resolve: Function): void => {
      setTimeout((): void => {
        logger.info('Timeout over');
        resolve();
      }, millisecondsToWait);
    });

    return valueToReturn;
  }

}
