# Process Engine Runtime

This is a stand-alone Server of the ProcessEngine, that can be installed and started globally.

## What are the goals of this project?

The goal is to provide a runtime for local development utilizing the Process
Engine.

### Requirements

- Node >= `7.6.0`
- Python 2.7.x

### Setup/Installation


Install all Dependencies

```bash
npm install -g @process-engine/process_engine_runtime
```

__Note:__ If you experience problems during installation on Windows, you can try
installing the [Windows Build
Tools](https://www.npmjs.com/package/windows-build-tools) and run the above
installation command again.
Please make sure that you run the shell you use for
the installation as **Administrator**.


## How do I use this project?

### Starting the ProcessEngine-Server

Start the server on your main machine with

```bash
process-engine
```

When started, the process-engine-instance is available at

`http://localhost:8000`.

__Note:__ If you're on Windows and the command `process-engine` can not be
found, please make sure your `PATH` is set correctly.

#### With SQLite Database (default)

```bash
NODE_ENV=sqlite process-engine
```

The database files will be placed in the `databases` directory mentioned in
[Application Files](#application_files).

#### With PostgreSQL Database

__Note:__ This requires a running PostgreSQL instance on your system. The
standard configuration requires it to run on port `5432`.

```bash
NODE_ENV=postgres process-engine
```

#### Customized Configuration

By default, the runtime will use a set of configurations located within an integrated `config`
folder.

If you wish to provide your own set of configurations, you can do so by setting the following
environment variables prior to startup:
- `CONFIG_PATH` - The path to your configuration folder 
- `NODE_ENV` - The name of the environment to use

**NOTE:**
The path in `CONFIG_PATH` must be absolute.

Also, each environment must have its own configuration folder.

See [here](https://github.com/process-engine/process_engine_runtime/tree/develop/config/sqlite) for an example on how a config must be structured.

**Make sure you provide settings to _all_ config sections listed there!**

**Example**:

Let's say you want to store your configs in your local home folder, in a subfolder named `runtime`
and the environment you wish to use is named `production`.

Your configs must then be located in the following path:
- macOS: `/Users/{{YOUR_USERNAME}}/runtime/production`
- Linux: `/home/{{YOUR_USERNAME}}/runtime/production`
- Windows: `C:\Users\{{YOUR_USERNAME}}\runtime\production`

You would need to provide the following environment parameters to access this config:
- `CONFIG_PATH`:
    - macOS: `/Users/{{YOUR_USERNAME}}/runtime`
    - Linux: `/home/{{YOUR_USERNAME}}/runtime`
    - Windows: `C:\Users\{{YOUR_USERNAME}}\runtime`
- `NODE_ENV` = `production`

The full start command will then look like this:
- macOS: `CONFIG_PATH=/Users/{{YOUR_USERNAME}}/runtime NODE_ENV=production process-engine`
- Linux: `CONFIG_PATH=/home/{{YOUR_USERNAME}}/runtime NODE_ENV=production process-engine`
- Windows: `CONFIG_PATH=C:\Users\{{YOUR_USERNAME}}\runtime NODE_ENV=production process-engine`

### Automatically starting ProcessEngine-Server on system startup

**macOS**

In order to start the ProcessEngine on system start, we provide a script.

There are two scripts:

1. start_runtime_after_system_boot.sh
1. do_not_start_runtime_after_system_boot.sh

If you installed Node.js as a standalone application, you can find the scripts
at:

```
/usr/local/lib/node_modules/@process-engine/process_engine_runtime/scripts/autostart
```

If you installed Node.js via [nvm](https://github.com/creationix/nvm), you can
find the scripts at:

```
/Users/{{YOUR_USERNAME}}/.nvm/versions/node/{{YOUR_NODE_VERSION}}/lib/node_modules/@process-engine/process_engine_runtime/scripts/autostart
```

Use:

```bash
bash autostart/start_runtime_after_system_boot.sh
```

This will use pm2 to setup the ProcessEngine as automatically started service.

__Note:__ Currently the `do_not_start_runtime_after_system_boot.sh`-script
doesn't work under macOS due to a bug in a third party package. As soon as the
bug is fixed, we will update the script and release a fix.

**Windows**

In order to start the ProcessEngine on system start, we provide a script.

There are two scripts:

1. start_runtime_after_system_boot.bat
1. do_not_start_runtime_after_system_boot.bat

You can find the scripts at:

```
C:\Users\{{YOUR_USERNAME}}\AppData\Roaming\npm\node_modules\@process-engine\process_engine_runtime\scripts\autostart
```

Please make sure to execute the scripts as __Administrator__.

If you run the `start_runtime_after_system_boot.bat`-script to automatically
start the `process_engine_runtime`, you will be asked several questions.

Please use the default values on every question by:
1. Typing `Y` and confirm your choice by pressing the `Enter`-key if it is a
  yes/no question.
1. Just pressing the `Enter`-key on all other questions.


**Other Platforms**

Currently we have no scripts for setup the service for autostart.

### Application Files <a name="application_files"></a>

The application files are stored in:

| Platform   | Folder Path                                                            |
| ---------- | ----------                                                             |
| Macintosch | `/Users/<Username>/Library/Application Support/process_engine_runtime` |
| Linux      | `/home/<Username>/.config/process_engine_runtime`                      |
| Windows    | `c:\Users\<Username>\AppData\Roaming\process_engine_runtime`           |

Contained in the application files are the following folders:

| Path         | Description           |
| ---------    | ----------            |
| `databases/` | SQLite database files |
| `logs/`      | Logfiles              |
| `metrics/`   | Recorded metrics      |

### Authors/Contact information

1. [Christian Werner](mailto:christian.werner@5minds.de)
2. [Sebastian Meier](mailto:sebastian.meier@5minds.de)
3. [Christoph Gnip](mailto:christoph.gnip@5minds.de)
