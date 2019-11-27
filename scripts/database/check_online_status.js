/* eslint-disable @typescript-eslint/explicit-function-return-type */
const exec = require('child_process').exec;

async function checkOnlineStatus() {
  let isOnline = false;

  while (!isOnline) {
    try {
      await execCommand(`curl 0.0.0.0:${process.env.PORT}`);
      isOnline = true;
    } catch (error) {
      console.log(error);
      const errorIsEmptyReply = error.toString().includes('Empty reply from server');
      if (error === null || errorIsEmptyReply) {
        isOnline = true;
      }
    }
  }
}

async function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err || stderr) {
        reject(err, stderr);
      }
      return resolve(stdout);
    });
  });
}

checkOnlineStatus();
