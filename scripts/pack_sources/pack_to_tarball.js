const exec = require('./exec_async').execAsync;
const os = require('os');

const packageName = os.platform() === 'darwin'
  ? 'process_engine_runtime_macos.tar.gz'
  : 'process_engine_runtime_linux.tar.gz';

// TODO: For some reason, this causes a "tar: .: file changed as we read it" error, when Jenkins tries to pack the linux sources.
// const tarballCommand = 'tar -czvf process_engine_runtime_macos.tar.gz --exclude=\'.git*\' --exclude=\'Jenkinsfile\' --exclude=\'Dockerfile\' --exclude=\'.npmignore\' .';
const tarballCommand = `tar -czf ${packageName} bin bpmn config dist node_modules scripts sequelize src test .eslintignore .eslintrc LICENSE package-lock.json package.json README.md reinstall.sh swagger.html tsconfig.json`;

exec(tarballCommand)
  .then(() => console.log('Success!'))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
