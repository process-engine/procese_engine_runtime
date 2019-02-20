# ProcessEngine Runtime Installer

Create a windows installer for the ProcessEngine Runtime.

## Requirements

- All requirements from [README](../README.md).
- Windows Operating Sytem
  - Native dependencies will not work otherwise.
- [Inno Setup](http://www.jrsoftware.org/isinfo.php) >= 5.6.1

## Steps

1. Install dependencies and build:

    ```bat
    npm install
    npm run build
    npm rebuild
    ```

1. Create an executable file from the runtime:

    ```bat
    npm run create-executable-win
    ```

    This script will use `pkg` to create the `process_engine_runtime.exe`
    executable.

1. Create installer with Inno Setup

    ```bat
    "C:\Program Files (x86)\Inno Setup 5\ISCC.exe" /DProcessEngineRuntimeVersion=<TargetVersion> installer\inno-installer.iss
    ```

    Replace `<TargetVersion>` with the actual version of the runtime.

    By default the created installed will be placed in under
    `Output/Install ProcessEngine Runtime v<TargetVersion>.exe`.

## Notes

### Native Bindings

Some of our dependencies use native bindings. `pkg` will not include the
required files. Instead they must be placed manually near the executable.

For example `sqlite3`: When the native binding is not found an error message
is shown:

```
Error: Please install sqlite3 package manually
```

The solution to this problem is to copy the native bindings next to the
executable (See _Figure 1_). The installer will take care of this.

### Config Paths

By default the ProcessEngine Runtime stores its configuration in `./config`.
This would result in storing the configuration inside the installation folder.
To prevent this the `CONFIG_PATH` environment variable must be overridden.

The `start_process_engine_runtime.bat` starts the `process_engine_runtime-win.exe`
using the correct `CONFIG_PATH`.

### Final Installation Layout

_Figure 1_: Final layout of installation folder:
```
ProcessEngine Runtime
\
|   process_engine_runtime-win.exe
|   start_process_engine_runtime.bat
|   unins000.dat
|   unins000.exe
|
\---node_modules
    \---sqlite3
        \---lib
            |   index.js
            |   sqlite3.js
            |   trace.js
            |
            \---binding
                \---node-v57-win32-x64
                        node_sqlite3.node
```



