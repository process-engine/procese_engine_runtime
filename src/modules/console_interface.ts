import {InvocationContainer} from 'addict-ioc';
import * as chalk from 'chalk';
import {AddressInfo} from 'net';
import * as readline from 'readline';

import {HttpExtension} from '@essential-projects/http_extension';

import * as environment from './environment';

let container: InvocationContainer;

const commands = ['help', 'version', 'httpconfig'];
const commandDelegates = {
  help: (): void => printHelp(),
  version: (): void => printVersion(),
  httpconfig: (): void => printHttpInfo(),
};

let httpIsEnabled: boolean;

export function intialize(iocContainer: InvocationContainer, httpEnabled: boolean): void {

  container = iocContainer;
  httpIsEnabled = httpEnabled;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', processCommand);
}

function processCommand(command: string): void {

  const commandIsEmpty = command.trim().length === 0;
  if (commandIsEmpty) {
    return;
  }

  const isValidCommand = commands.some((cmd) => cmd === command);

  if (isValidCommand) {
    commandDelegates[command]();
  } else {
    console.log(chalk.redBright('Unknown command: '), command);
    printHelp();
  }
}

function printHelp(): void {

  const help = `${chalk.yellow('Available Commands')}:

  ${chalk.blueBright('version')}:    Prints the version of the ProcessEngineRuntime
  ${chalk.blueBright('httpconfig')}: Prints the ProcessEngineRuntime's http settings (port, address and IP protocol)
  ${chalk.blueBright('help')}:       Prints this dialog
  `;

  console.log(help);
}

function printVersion(): void {
  const packageJson = environment.readPackageJson();

  console.log('');
  console.log(`${chalk.blueBright('ProcessEngineRuntime version')}: `, packageJson.version);
  console.log('');
}

function printHttpInfo(): void {

  if (!httpIsEnabled) {
    console.log('');
    console.log(chalk.blueBright('Http is disabled.'));
    console.log('');
  } else {
    const httpExtension = container.resolve<HttpExtension>('HttpExtension');

    const httpInfo = (httpExtension.httpServer.address() as AddressInfo);

    console.log('');
    console.log(chalk.blueBright('Http address: '), httpInfo.address);
    console.log(chalk.blueBright('Http port: '), httpInfo.port);
    console.log(chalk.blueBright('IP protocol: '), httpInfo.family);
    console.log('');
  }
}
