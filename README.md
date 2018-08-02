# Process Engine Runtime

This is a stand-alone Server of the ProcessEngine, that can be installed and started globally.

## What are the goals of this project?

The goal is to provide a runtime for local development utilizing the Process
Engine.

### Requirements

- Node >= `7.6.0`

### Setup/Installation

Install all Dependencies

```bash
npm install -g @process-engine/process_engine_runtime
```

## How do I use this project?

### Usage

Start the server on your main machine with

```bash
process-engine
```

When started, the process-engine-instance is available at

`http://localhost:8000`.

### Application Files

The application files are stored in:

| Platform  | Folder Path                                                            |
| --------- | ----------                                                             |
| OS X      | `/Users/<Username>/Library/Application Support/process_engine_runtime` |
| Linux     | `/home/<Username>/.config/process_engine_runtime`                      |
| Windows   | `c:\Users\<Username>\AppData\Roaming\process_engine_runtime`           |

Contained in the application files are the following folders:

| Path         | Description           |
| ---------    | ----------            |
| `databases/` | SQLite database files |

### Authors/Contact information

1. [Sebastian Meier](mailto:sebastian.meier@5minds.de)
1. [Christoph Gnip](mailto:christoph.gnip@5minds.de)
