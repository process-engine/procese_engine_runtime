@ echo off

echo Remember to execute the script in its folder.
echo The sql scripts need to be in the same folder.
::save path to scripts
set script_path=%cd%

::Get postgres version
echo You need to provide your postgreSQL version
echo If you do not know you postgreSQL version, have a look at \Program Files\PostgreSQL
set /p pg_version=Enter your postgreSQL version:
echo %pg_version%

echo ------ Create pgpass.con file ------
echo .
::Create pgpass file with postgres password
:choice
set /P c=Create pgpass backup - Create temp pgpass file - Backup will be restored. [Y/N]?
if /I "%c%" EQU "Y" goto :create_pgpass
if /I "%c%" EQU "N" goto :end

:create_pgpass
	cd %appdata%
	mkdir postgresql
	cd postgresql
	mv pgpass.conf pgpass.conf.bak
	touch pgpass.conf && echo localhost:5432:*:postgres:postgres> pgpass.conf

::Go to postgresql directory
cd C:\Program Files\PostgreSQL\%pg_version%\bin

::If Database exists - drop
:choice
set /P c=Do you want to drop your current database 'processengine'? [Y/N]?
if /I "%c%" EQU "Y" goto :drop_db
if /I "%c%" EQU "N" goto :proceed

:drop_db
psql -U postgres -w -c "DROP DATABASE processengine"

:proceed
psql -U postgres -w -f %script_path%\create_role_and_db.sql

:choice
set /P c=Delete temp pgpass - Restore backup?[Y/N]?
if /I "%c%" EQU "Y" goto :remove_pgpass
if /I "%c%" EQU "N" goto :end

:remove_pgpass
echo ------ Restore pgpass file ------
::Restore pgpass file
	cd %appdata%
	cd postgresql
	rm -f pgpass.conf
	mv pgpass.conf.bak pgpass.conf

:end
echo ------ The End ------
::pgpass file not removed
cd %userprofile%
