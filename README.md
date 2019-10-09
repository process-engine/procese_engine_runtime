# Process Engine Runtime

This is a stand-alone Server of the ProcessEngine, that can be installed and started globally.

## What are the goals of this project?

The goal is to provide a runtime for local development utilizing the Process
Engine.

### Requirements

- Node >= `7.6.0`
- Python 2.7.x

### Setup/Installation

Install the runtime as a global npm package:

```bash
npm install -g @process-engine/process_engine_runtime
```

__Note:__ If you experience problems during installation on Windows, you can try
installing the [Windows Build
Tools](https://www.npmjs.com/package/windows-build-tools) and run the above
installation command again.
Please make sure that you run the shell you use for
the installation as **Administrator**.

Also, each full release provides ready-to-use source files for each platform.
These are stored in a `.tar.gz` archive (for macOS and Linux) and a zip file (for windows).

All these sources have been fully installed and build.
You only need to download and unpack them and you are good to go.

## How to use this project

### Starting the ProcessEngineRuntime

You can start the application with the following command:

```bash
process-engine
```

When started, the ProcessEngine is available at

`http://localhost:8000`.

__Note:__ If you're on Windows and the command `process-engine` can not be
found, please make sure your `PATH` is set correctly.

### Global routes

The ProcessEngine exposes a number of global HTTP routes,
which you can use to get general information about the application.

These routes include:

- `http://localhost:8000/` - Base route to get basic details about the ProcessEngine
- `http://localhost:8000/process_engine` - Same as above
- `http://localhost:8000/security/authority` - Returns the address of the authority
  the ProcessEngine uses to perform claim checks
- `http://localhost:8000/process_engine/security/authority` - Same as above

You might wonder why we use two routes for each UseCase.

The reason is simple:
Lets say you want to embed your ProcessEngine into another web application.
Usually, you'd want to use routes like `http://localhost:8000/` for your own
purposes and not have it expose information about any embedded service
(which is what the ProcessEngine would be in this instance).

BPMN Studio uses these global routes to identify remote ProcessEngines to connect to.
The route `http://localhost:8000/process_engine` ensures that the studio can do so, even if
`http://localhost:8000/` is reserved by your application.

In other words: These routes allow you to access an embedded ProcessEngine through BPMN Studio.

**Note:**
See the [Other startup parameters](#other_startup_parameters) section for instructions
on how to prevent the ProcessEngine from using these global routes.

#### Switching the database

By default, the ProcessEngine will use `SQLite` as its database.

The corresponding files will be placed in the `databases` directory mentioned in the
[Application Files](#application_files) section.

If you want to use a different database, you must provide a `NODE_ENV` parameter at startup:

```bash
NODE_ENV=postgres process-engine
```

Currently supported values are `postgres` and `mysql`.

Each environment comes with its own config.

See:

- [Configuration for mysql repositories](./config/mysql/process_engine)
- [Configuration for postgres repositories](./config/postgres/process_engine)
- [Configuration for sqlite repositories](./config/sqlite/process_engine)

**Note:**
Switching to MySQL or Postgres requires an instance of the respective database to be running and accessible!

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

- `NODE_ENV`: `production`
- `CONFIG_PATH`:
    - macOS: `/Users/{{YOUR_USERNAME}}/runtime`
    - Linux: `/home/{{YOUR_USERNAME}}/runtime`
    - Windows: `C:\Users\{{YOUR_USERNAME}}\runtime`

The full start command will then look like this:

- macOS: `CONFIG_PATH=/Users/{{YOUR_USERNAME}}/runtime NODE_ENV=production process-engine`
- Linux: `CONFIG_PATH=/home/{{YOUR_USERNAME}}/runtime NODE_ENV=production process-engine`
- Windows: `CONFIG_PATH=C:\Users\{{YOUR_USERNAME}}\runtime NODE_ENV=production process-engine`

#### Other startup parameters

There are various other parameters you can provide at startup:

- `NO_HTTP`: Providing this flag will disable all HTTP endpoints of the ProcessEngine.
  This can be useful if you are embedding the ProcessEngine into another application
  and you do not intend for the ProcessEngine to expose its own HTTP routes
- `DO_NOT_BLOCK_GLOBAL_ROUTE`: Disables the global routes `http://localhost:8000/` and `http://localhost:8000/security/authority`.
  This can be useful, if you are embedding the ProcessEngine into another web application,
  where you would usually want to reserve such routes for your own purposes

### Automatically starting the ProcessEngineRuntime on system startup

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
2. [René Föhring](mailto:rene.foehring@5minds.de)
