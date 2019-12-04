# Process Engine Runtime

This is a stand-alone Server of the ProcessEngine, that can be installed and started globally.

## What are the goals of this project

The goal is to provide a ready-to-use environment for utilizing the ProcessEngine.

## Table of contents

- [Requirements](#requirements)
- [Setup](#setup)
    - [Using npm](#using-npm)
    - [Using pre-build sources](#using-pre-build-sources)
- [Starting the ProcessEngineRuntime](#starting-the-processengineruntime)
    - [Global Routes](#global-routes)
    - [Switching the database](#switching-the-database)
    - [Customized Configuration](#customized-configuration)
- [Embedding the ProcessEngineRuntime into another application](#embedding-the-processengineruntime-into-another-application)
    - [Parameters](#parameters)
- [Starting the ProcessEngineRuntime on system boot](#starting-the-processengineruntime-on-system-boot)
    - [macOS](#macos)
    - [Windows](#windows)
- [Application Files](#application-files)
- [Authors](#authors)

## Requirements

- Node >= `10.15.0`
- Python 2.7.x

## Setup

### Using npm

Install the runtime as a global npm package:

```bash
npm install -g @process-engine/process_engine_runtime
```

**Note:**
If you are experiencing problems during installation on Windows,
you can try installing the [Windows Build Tools](https://www.npmjs.com/package/windows-build-tools) and run the installation command again.

Also make sure that you run the command shell as **Administrator**.

### Using pre-build sources

We provide ready-to-use sources with all our GitHub releases and pre-releases.

These are stored in a `.tar.gz` archive (for macOS and Linux) and a `.zip` file (for windows).

All sources have been fully installed and build.

You only need to download and unpack them and you are good to go.

The linux sources have been build on an ubuntu machine, but they should work on any other distribution as well.

**NOTE:**

The sources were build with NodeJS v10.

If you are using a different major NodeJS version (i.e. v11 or higher), you may encounter errors such as this:

```sh
2019-12-04T13:00:43.421Z - error: [processengine:runtime:startup] Error:  Error: Please install sqlite3 package manually
```

If that is the case, you will need to run `npm rebuild`, before you can use the sources.

## Starting the ProcessEngineRuntime

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
Let's say you want to embed your ProcessEngine into another web application.
Usually, you'd want to use routes like `http://localhost:8000/` for your own
purposes and not have it expose information about any embedded service
(which is what the ProcessEngine would be in this instance).

BPMN Studio uses these global routes to identify remote ProcessEngines to connect to.
The route `http://localhost:8000/process_engine` ensures that the studio can do so, even if
`http://localhost:8000/` is reserved by your application.

In other words: These routes allow you to access an embedded ProcessEngine through BPMN Studio.

**Note:**
See the [Embedding instructions](#embedding_the_processengineruntime_into_another_application) section
on how to prevent the ProcessEngine from using `/` and `/security/authority`.

### Switching the database

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

### Customized Configuration

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

## Embedding the ProcessEngineRuntime into another application

The ProcessEngineRuntime is published at npm under the name `@process-engine/process_engine_runtime`.

You can add it to your package.json like any other npm package.

To start the runtime, you need to run this command once from inside your application:

```ts
import * as ProcessEngine from '@process-engine/process_engine_runtime';

await ProcessEngine.startRuntime(args);
```

### Parameters

The `startRuntime` function takes an object with the following optional parameters:

- `workDir`: A path to where the runtime will store its working data (i.e. 'workspace'). The path must be absolute
- `sqlitePath`: A path to where the runtime should store its SQlite databases
    - Works in conjunction with `NODE_ENV=sqlite`
    - The path must be absolute
- `logFilePath`: A path to where the runtime should store its logfiles. The path must be absolute
- `container`: An `addict-ioc` InvocationContainer, where the runtime should register its dependencies at
- `minimalSetup`: If set to true, the runtime will only perform ioc registrations, but nothing else
    - Use this, if you want to launch the ProcessEngineRuntime manually
    - Defaults to `false`
- `enableHttp`: If set to true, all HTTP endpoints the ProcessEngineRuntime uses will be loaded
    - Use `false` to prevent the ProcessEngineRuntime from providing HTTP endpoints
    - Defaults to `true`
- `useHttpRootRoutes`: If set to `true`, the routes `/` and `/security/authority` will be set by the ProcessEngineRuntime
    - Set to `false` if you want to use these routes for other purposes
    - Defaults to `true`

Example:

```ts
import {InvocationContainer} from 'addict-ioc';
import * as ProcessEngine from '@process-engine/process_engine_runtime';

const myInvocationContainer = new InvocationContainer();

await ProcessEngine.startRuntime({
  workDir: `/home/myfancyusername/somedirectory`,
  sqlitePath: `/var/lib/somepath`,
  logFilePath: `var/log/somepath`,
  container: myInvocationContainer,
  minimalSetup: true,
  enableHttp: false,
  useHttpRootRoutes: false,
});
```

## Starting the ProcessEngineRuntime on system boot

We provide scripts that let you start the ProcessEngineRuntime automatically as a service.

Currently supported platforms are `macOS` and `windows`.

### macOS

There are two scripts:

1. `start_runtime_after_system_boot.sh` - Causes the ProcessEngineRuntime to be started automatically as a service
1. `do_not_start_runtime_after_system_boot.sh` - Prevents the ProcessEngineRuntime from being started automatically

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

Usage:

```bash
bash autostart/start_runtime_after_system_boot.sh
```

 The scripts use pm2 to setup the ProcessEngine as an automatically started service.

__Note:__ Currently the `do_not_start_runtime_after_system_boot.sh`-script
doesn't work under macOS due to a bug in a third party package. As soon as the
bug is fixed, we will update the script and release a fix.

### Windows

We also provide `.bat` scripts to setup the Runtime as a global service on windows.

These scripts are located at:

```
C:\Users\{{YOUR_USERNAME}}\AppData\Roaming\npm\node_modules\@process-engine\process_engine_runtime\scripts\autostart
```

Make sure you run these scripts as __Administrator__.

During execution of the `start_runtime_after_system_boot.bat` script, you will be asked several questions.

Please use the default values on every question.

1. Typing `Y` and pressing the `Enter`-key for `yes/no` questions
2. Just pressing the `Enter`-key on all other questions.

## Application Files

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

## Authors

1. [Christian Werner](mailto:christian.werner@5minds.de)
2. [René Föhring](mailto:rene.foehring@5minds.de)
