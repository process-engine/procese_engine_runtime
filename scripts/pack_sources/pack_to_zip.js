const exec = require('./exec_async').execAsync;

const zipCommand = 'zip -rq process_engine_runtime_windows.zip --exclude=\'.git*\' --exclude=\'Jenkinsfile\' --exclude=\'Dockerfile\' --exclude=\'.npmignore\' .';

exec(zipCommand)
  .then(() => console.log('Success!'))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
