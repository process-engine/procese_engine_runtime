# ProcessEngine-FullstackServer MSSQL-DB

## Requirements

- docker >= `17.06.0-ce`

## Setup

### Build and start the volume- and database-containers

To bootstrap a new MySQL database, simply run:
```bash
node mysql_docker.js start
```

If you already have a database setup and want to reset it, run:
```bash
node mysql_docker.js reset
```

## Configuration

The docker containers can be configured in the `mysql_docker.sh`:

- `db_user_name` is the username of the db-admin-account
- `db_sa_user_password` is the password of the database's super user
- `db_user_password` is the password of the db-admin-account
- `db_name` is the name the ProcessEngine-database will have
- `db_port` is the port on which the database listens and the container is published
- `max_retries` is the maximum amount of retries for the database polling

## Usage
The Database is available on its default port `1433`.

It will automatically add a new user with the given username and password.

The convenience-script `mysql_docker.sh` lets you:
```bash
node mssql_docker.js start   # create and start the volume and db container
node mssql_docker.js stop    # stop the db container
node mssql_docker.js restart # run stop and then start
node mssql_docker.js reset   # run stop, then delete volume and db-container and then run start
```
