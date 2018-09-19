# process-engine Skeleton PostgreSQL-DB

## Requirements

##### Linux/Unix
- an x86 computer
- bash

##### Windows
- an x86 computer

## Setup demo database without docker

Pre-requisites:
- Installed and running postgres.
- The database "processengine" and the role "admin" must not yet exist.

##### Linux/Unix
If you want to setup the database without installing docker on Linux/Unix, navigate to the folder in which the scripts are located and execute the included script `setup_db_linux_unix.sh`. It will run the necessary SQL commands to create the database "procesengine" and the role "admin".

##### Windows
If you want to setup the database without installing docker on Windows, navigate to the folder in which the scripts are located and execute the included script `setup_db_windows.cmd`. It will run the necessary SQL commands to create the database "procesengine"and the role "admin".


## What else is there to know?

The command used to create the user-table-backup is:

```
pg_dump \
  --format plain \
  --file "user.sql" \
  --host localhost \
  --no-password \
  --port 5432 \
  --table "public.\"User\"" "processengine"
  --username "admin" \
  --verbose \
```
