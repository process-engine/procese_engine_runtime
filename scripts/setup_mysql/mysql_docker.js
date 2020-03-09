'use strict';

const exec = require('child_process').exec;
const os = require('os');

const command = process.argv[2];

const dbName = 'processengine';
const dbPort = 3306;
const maxRetries = 20;

const dbContainerName = 'process_engine_mysql_container';
const dbVolumeName = 'process_engine_mysql_volume';

let logPath = '/dev/null';
if (os.platform() === 'win32') {
  logPath = 'NUL';
}
async function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function runCommand(commandToRun) {
  return new Promise((resolve, reject) => {
    exec(commandToRun, {maxBuffer: 2097152}, (error, stdout, stderr) => {
      if (error !== null) {
        return reject(error);
      }

      return resolve(stdout);
    });
  });
}

async function createDbContainer() {
  const containerId = await runCommand(`\
    docker run \
      --detach \
      --env MYSQL_ROOT_PASSWORD=root \
      --publish ${dbPort}:3306 \
      --name ${dbContainerName} \
      --mount source=${dbVolumeName},target=/var/lib/mysql \
      mysql:latest > ${logPath} \
    `);

  console.log('Waiting until the Container becomes ready...');
  await sleep(1000);

  for (let tryNumber = 0; tryNumber <= maxRetries; tryNumber++) {
    try {
      await runCommand(`\
        docker exec ${dbContainerName} \
          mysql --user=root --password=root -e "CREATE DATABASE IF NOT EXISTS ${dbName};"
      `);

      // await runCommand(`\
      //   docker exec ${dbContainerName} \
      //   mysql --user=root --password=${dbAdminPassword} -e "GRANT ALL PRIVILEGES ON ${dbName}.* TO '${dbUserName}';"
      //   `);

      console.log('Container setup done.');
      break;

    } catch (error) {
      if (tryNumber >= maxRetries) {
        console.log('Maximal number of retries reached.');
        console.log('Failed to start the MySQL Container.');
        throw (error);
      }

      await sleep(1000);
    }
  }

  return containerId;
}

function getExistingVolumeId() {
  return runCommand(`docker volume ls --quiet --filter name=${dbVolumeName}`);
}

function getExistingDbContainerId() {
  return runCommand(`docker ps --all --quiet --filter name=${dbContainerName}`);
}

function getRunningDbContainerId() {
  return runCommand(`docker ps --quiet --filter name=${dbContainerName}`);
}

async function start() {
  // If the container is already running, abort
  const runningContainerId = await getRunningDbContainerId();
  if (runningContainerId !== '') {
    console.log('Container is already running');
    return undefined;
  }

  const existingContainerId = await getExistingDbContainerId();
  if (existingContainerId !== '') {
    console.log('starting DB-Container');
    return runCommand(`docker start ${dbContainerName} > ${logPath}`);
  }

  console.log('creating DB-Container');
  return createDbContainer();
}

async function stop() {
  const runningContainerId = await getRunningDbContainerId();
  if (runningContainerId === '') {
    console.log('DB-Container is already stopped');
    return undefined;
  }

  console.log('stopping DB-Container');
  return runCommand(`docker stop ${dbContainerName} > ${logPath}`);
}

async function clear() {
  await stop();

  // Remove the DB-Container
  const existingContainerId = await getExistingDbContainerId();
  if (existingContainerId != '') {
    console.log('removing DB-Container');
    await runCommand(`docker rm ${dbContainerName} > ${logPath}`)
  } else {
    console.log('DB-Container already removed');
  }

  // Remove volume
  const exitingVolumeId = await getExistingVolumeId();
  if (exitingVolumeId === '') {
    console.log('Volume already removed');
    return undefined;
  }

  console.log('removing Volume');
  return runCommand(`docker volume rm ${dbVolumeName} > ${logPath}`);
}

async function reset() {
  await clear();
  return start();
}

async function run() {
  if (command === 'start') {
    await start();
  } else if (command === 'stop') {
    await stop();
  } else if (command === 'restart') {
    await stop();
    await start();
  } else if (command === 'reset') {
    await reset();
  } else if (command === undefined || command === null || command.length === 0) {
    console.log(`Usage:

node postgres_docker.js start     # create and start the volume and db container
node postgres_docker.js stop      # stop the db container
node postgres_docker.js restart   # run stop and then start
node postgres_docker.js reset     # run stop, then delete volume and db-container and then run start`);
  } else {
    console.log(`Unknown command '${command}'`);
  }
}

run()
  .catch((error) => {
    console.log('error executing your command:', error);
  });
