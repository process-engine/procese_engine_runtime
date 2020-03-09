# ProcessEngine-Runtime PostgreSQL-DB

## Requirements

- docker >= `17.06.0-ce`

## Setup

### Build and start the volume- and database-containers

To bootstrap a new PostgreSQL database, simply run:
```bash
node postgres_docker.js start
```

If you already have a database setup and want to reset it, run:
```bash
node postgres_docker.js reset
```

## Configuration

The docker containers can be configured in the `postgres_docker.sh`:

- `db_user_name` is the username of the db-admin-account
- `db_user_password` is the password of the db-admin-account
- `db_name` is the name the processengine-database will have

## Usage
The Database is available on its default port `5432`.

It will automatically add the following two users, if it recreated the DB:
```
username: admin
password: admin
roles: ['administrator']

username: exampleuser
password: password
roles: ['user']
```

If the database was bootstrapped for the reservation-process, the following user will also be added:
```
username: operator
password: operator
roles: ['operator']
```

The convenience-script `postgres_docker.sh` lets you:
```bash
node postgres_docker.js start   # create and start the volume and db container
node postgres_docker.js stop    # stop the db container
node postgres_docker.js restart # run stop and then start
node postgres_docker.js reset   # run stop, then delete volume and db-container and then run start
```

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
