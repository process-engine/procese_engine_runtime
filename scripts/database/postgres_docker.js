const exec = require('child_process').exec;
const path = require('path');
const os = require('os');

const command = process.argv[2]

const db_user_name = 'admin';
const db_user_password = 'admin';
const db_name = 'processengine';
const db_port = 5432;

const db_docker_image_name = 'process_engine_postrgres';
const db_container_name = 'process_engine_postrgres_container';
const db_volume_name = 'process_engine_postgres_volume';

let log_path = '/dev/null';
if (os.platform() === 'win32') {
  log_path = 'NUL';
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, {maxBuffer: 2097152}, (error, stdout, stderr) => {
      if (error !== null) {
        return reject(error);
      }

      return resolve(stdout);
    });
  });
}

async function create_db_container() {
  let dockerfile = 'Dockerfile.skeleton';

  await runCommand(`\
    docker build \
      --file ${path.join(__dirname, dockerfile)} \
      --tag ${db_docker_image_name} \
      ${__dirname} > ${log_path} \
    `);

  return runCommand(`\
    docker run \
      --detach \
      --env POSTGRES_USER=${db_user_name} \
      --env POSTGRES_PASSWORD=${db_user_password} \
      --env POSTGRES_DB=${db_name} \
      --publish ${db_port}:5432 \
      --name ${db_container_name} \
      --mount source=${db_volume_name},target=/dbdata \
      ${db_docker_image_name} > ${log_path} \
    `)
}

function existing_volume_id() {
  return runCommand(`docker volume ls --quiet --filter name=${db_volume_name}`);
}

function existing_db_container_id() {
  return runCommand(`docker ps --all --quiet --filter name=${db_container_name}`);
}

function running_db_container_id() {
  return runCommand(`docker ps --quiet --filter name=${db_container_name}`);
}

async function start() {
  // If the container is already running, abort
  if (await running_db_container_id() !== '') {
    console.log('Container is already running');
    return;
  }

  if (await existing_db_container_id() !== '') {
    console.log('starting DB-Container');
    return runCommand(`docker start ${db_container_name} > ${log_path}`);
  }

  console.log('creating DB-Container');
  return create_db_container();
}

async function stop() {
  if (await running_db_container_id() === '') {
    console.log('DB-Container is already stopped');
    return;
  }

  console.log('stopping DB-Container');
  return runCommand(`docker stop ${db_container_name} > ${log_path}`);
}

async function clear() {
  await stop();

  // Remove the DB-Container
  if (await existing_db_container_id() != '') {
    console.log('removing DB-Container');
    await runCommand(`docker rm ${db_container_name} > ${log_path}`)
  } else {
    console.log('DB-Container already removed');
  }

  // Remove volume
  if (await existing_volume_id() === '') {
    console.log('Volume already removed');
    return;
  }

  console.log('removing Volume');
  return runCommand(`docker volume rm ${db_volume_name} > ${log_path}`);
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
  } else if (command === "restart") {
    await stop();
    await start();
  } else if (command === 'reset') {
    await reset();
  } else if (command === undefined || command === null || command.length === 0) {
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
