import {Logger} from 'loggerhythm';

const logger: Logger = Logger.createLogger('service_task:service_task_test_bnservice');

export class ServiceTaskTestService {

  /**
   * This is a sample function which justs returns one. Its used
   * in the test cases for the service Tasks.
   */
  public async returnOne(): Promise<number> {
    logger.info('Starting Service: Return One.');

    return 1;
  }

  /**
   * Sample function that returns a simple object.
   */
  public async returnObject(): Promise<any> {
    logger.info('Starting Service: Return Object');

    return {
      prop1: 1337,
      prop2: 'Hello World',
    };
  }

  /**
   * Simple function that just returns the given message.
   * @param message Message, that should be echoed.
   */
  public async echoParameter(message: string): Promise<string> {
    logger.info('Starting Service: Echo Parameter');

    return message;
  }

  /**
   * Add two numbers.
   * @param firstNumber First addend
   * @param secondNumber Second addend
   */
  public async addNumbers(firstNumber: number, secondNumber: number): Promise<number> {
    logger.info('Starting Service: Add Numbers');

    return firstNumber + secondNumber;
  }

  /**
   * Throw an exceptionn.
   */
  public async throwException(): Promise<void> {
    logger.info('Starting Service: Throw Exception');

    throw new Error('Failed');
  }

  /**
   * Delay a given amount of seconds.
   * @param timeInSeconds Time in seconds that the service should take.
   */
  public async delay(timeInSeconds: number, valueToReturn: any): Promise<any> {
    logger.info('Starting Service: Delay');
    logger.info(`Waiting ${timeInSeconds} seconds.`);

    /*tslint:disable:no-magic-numbers*/
    // Disable the linter check because to calculate milliseconds from seconds is kinda obvious.
    const millisecondsToWait: number = timeInSeconds * 1000;

    // Wait, until the timeout is over.
    await new Promise((resolve: Function): void => {
      setTimeout(() => {
        logger.info('Timeout over');
        resolve();
      }, millisecondsToWait);
    });

    return valueToReturn;
  }

}
