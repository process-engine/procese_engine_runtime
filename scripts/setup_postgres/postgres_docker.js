'use strict';

const exec = require('child_process').exec;
const path = require('path');
const os = require('os');

const command = process.argv[2];

const dbUserName = 'admin';
const dbUserPassword = 'admin';
const dbName = 'processengine';
const dbPort = 5432;

const dbDockerImageName = 'process_engine_postgres';
const dbContainerName = 'process_engine_postgres_container';
const dbVolumeName = 'process_engine_postgres_volume';

let logPath = '/dev/null';
if (os.platform() === 'win32') {
  logPath = 'NUL';
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
  const dockerfile = 'Dockerfile.skeleton';

  await runCommand(`\
    docker build \
      --file ${path.join(__dirname, dockerfile)} \
      --tag ${dbDockerImageName} \
      ${__dirname} > ${logPath} \
    `);

  return runCommand(`\
    docker run \
      --detach \
      --env POSTGRES_USER=${dbUserName} \
      --env POSTGRES_PASSWORD=${dbUserPassword} \
      --env POSTGRES_DB=${dbName} \
      --publish ${dbPort}:5432 \
      --name ${dbContainerName} \
      --mount source=${dbVolumeName},target=/dbdata \
      ${dbDockerImageName} > ${logPath} \
    `);
}

function existingVolumeId() {
  return runCommand(`docker volume ls --quiet --filter name=${dbVolumeName}`);
}

function existingDbContainerId() {
  return runCommand(`docker ps --all --quiet --filter name=${dbContainerName}`);
}

function runningDbContainerId() {
  return runCommand(`docker ps --quiet --filter name=${dbContainerName}`);
}

async function start() {
  // If the container is already running, abort
  if (await runningDbContainerId() !== '') {
    console.log('Container is already running');
    return;
  }

  if (await existingDbContainerId() !== '') {
    console.log('starting DB-Container');
    return runCommand(`docker start ${dbContainerName} > ${logPath}`);
  }

  console.log('creating DB-Container');
  return createDbContainer();
}

async function stop() {
  if (await runningDbContainerId() === '') {
    console.log('DB-Container is already stopped');
    return;
  }

  console.log('stopping DB-Container');
  return runCommand(`docker stop ${dbContainerName} > ${logPath}`);
}

async function clear() {
  await stop();

  // Remove the DB-Container
  if (await existingDbContainerId() != '') {
    console.log('removing DB-Container');
    await runCommand(`docker rm ${dbContainerName} > ${logPath}`)
  } else {
    console.log('DB-Container already removed');
  }

  // Remove volume
  if (await existingVolumeId() === '') {
    console.log('Volume already removed');
    return;
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

node postgres_docker.js start [scenario]   # create and start the volume and db container
node postgres_docker.js stop               # stop the db container
node postgres_docker.js restart            # run stop and then start
node postgres_docker.js reset [scenario]   # run stop, then delete volume and db-container and then run start`);
  } else {
    console.log(`Unknown command '${command}'`);
  }
}

run()
  .catch((error) => {
    console.log('error executing your command:', error);
  });
