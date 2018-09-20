#!/bin/bash

########################################
# script will be executed as user "postgres"
########################################
sudo su postgres <<END

psql -f create_role_and_db.sql
exit

END
