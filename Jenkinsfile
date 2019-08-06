#!/usr/bin/env groovy

def cleanup_workspace() {
  cleanWs()
  dir("${WORKSPACE}@tmp") {
    deleteDir()
  }
  dir("${WORKSPACE}@script") {
    deleteDir()
  }
  dir("${WORKSPACE}@script@tmp") {
    deleteDir()
  }
}

@NonCPS
def create_summary_from_test_log(testlog, test_failed, database_type) {
  def passing_regex = /\d+ passing/;
  def failing_regex = /\d+ failing/;
  def pending_regex = /\d+ pending/;

  def passing_matcher = testlog =~ passing_regex;
  def failing_matcher = testlog =~ failing_regex;
  def pending_matcher = testlog =~ pending_regex;

  def passing = passing_matcher.count > 0 ? passing_matcher[0] : '0 passing';
  def failing = failing_matcher.count > 0 ? failing_matcher[0] : '0 failing';
  def pending = pending_matcher.count > 0 ? pending_matcher[0] : '0 pending';

  def result_string;

  // Note that mocha will always print the amount of successful tests, even if there are 0.
  // So this must be handled differently here.
  def no_tests_executed = passing == '0 passing' && failing_matcher.count == 0;

  if (test_failed == true) {
    result_string =  ":boom: *${database_type} Tests failed!*";
  } else if (no_tests_executed) {
    result_string =  ":question: *No tests for ${database_type} were executed!*";
  } else {
    result_string =  ":white_check_mark: *${database_type} Tests succeeded!*";
  }

  if (passing_matcher.count > 0) {
    result_string += "\\n\\n${passing}";
  }

  if (failing_matcher.count > 0) {
    result_string += "\\n${failing}";
  }

  if (pending_matcher.count > 0) {
    result_string += "\\n${pending}";
  }

  return result_string;
}

def slack_send_summary(testlog, test_failed) {

  def color_string     =  '"color":"good"';
  def markdown_string  =  '"mrkdwn_in":["text","title"]';
  def title_string     =  "\"title\":\"ProcessEngine Runtime Integration test results for branch ${BRANCH_NAME}:\"";
  def result_string    =  "\"text\":\"${testlog}\"";
  def action_string    =  "\"actions\":[{\"name\":\"open_jenkins\",\"type\":\"button\",\"text\":\"Open this run\",\"url\":\"${RUN_DISPLAY_URL}\"}]";

  if (test_failed == true) {
    color_string = '"color":"danger"';
  }

  slackSend(attachments: "[{$color_string, $title_string, $markdown_string, $result_string, $action_string}]");
}

pipeline {
  agent any
  tools {
    nodejs "node-lts"
  }
  environment {
    NPM_RC_FILE = 'process-engine-ci-token'
    NODE_JS_VERSION = 'node-lts'
  }

  stages {
    stage('Prepare version') {
      steps {
        nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
          sh('npm ci')
          sh('node ./node_modules/.bin/ci_tools npm-install-only --except-on-primary-branches @process-engine/ @essential-projects/')

          // does prepare the version, but not commit it
          sh('node ./node_modules/.bin/ci_tools prepare-version --allow-dirty-workdir')

          // stash the package.json because it contains the prepared version number
          stash(includes: 'package.json', name: 'package_json')
        }

        archiveArtifacts('package-lock.json')
      }
    }
    stage('Build') {
      parallel {
        stage('Build npm package') {
          steps {
            unstash('package_json')

            nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
              sh('npm run build')
              sh('npm rebuild')
            }

            stash(includes: '*, **/**', name: 'post_build');
          }
        }
      }
    }
    stage('Process Engine Runtime Tests') {
      parallel {
        stage('MySQL') {
          agent {
            label 'any-docker && process-engine-tests'
          }
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('post_build');

            script {
              def mysql_host = "db";
              def mysql_root_password = "admin";
              def mysql_database = "processengine";
              def mysql_user = "admin";
              def mysql_password = "admin";

              def db_database_host_correlation = "process_engine__correlation_repository__host=${mysql_host}";
              def db_database_host_cronjob_history = "process_engine__cronjob_history_repository__host=${mysql_host}";
              def db_database_host_external_task = "process_engine__external_task_repository__host=${mysql_host}";
              def db_database_host_process_model = "process_engine__process_model_repository__host=${mysql_host}";
              def db_database_host_flow_node_instance = "process_engine__flow_node_instance_repository__host=${mysql_host}";

              def db_environment_settings = "${db_database_host_correlation} ${db_database_host_cronjob_history} ${db_database_host_external_task} ${db_database_host_process_model} ${db_database_host_flow_node_instance}";

              def mysql_settings = "--env MYSQL_HOST=${mysql_host} --env MYSQL_ROOT_PASSWORD=${mysql_root_password} --env MYSQL_DATABASE=${mysql_database} --env MYSQL_USER=${mysql_user} --env MYSQL_PASSWORD=${mysql_password} --volume $WORKSPACE/mysql:/docker-entrypoint-initdb.d/";

              def mysql_connection_string="server=${mysql_host};user id=${mysql_user};password=${mysql_password};persistsecurityinfo=True;port=3306;database=${mysql_database};ConnectionTimeout=600;Allow User Variables=true";

              def npm_test_command = "node ./node_modules/.bin/cross-env NODE_ENV=test-mysql JUNIT_REPORT_PATH=process_engine_runtime_integration_tests_mysql.xml CONFIG_PATH=config API_ACCESS_TYPE=internal ${db_environment_settings} ./node_modules/.bin/mocha -t 20000 test/**/*.js test/**/**/*.js";

              docker.image('mysql:5').withRun("${mysql_settings}") { c ->
                docker.image('mysql:5').inside("--link ${c.id}:${mysql_host}") {
                  sh 'while ! mysqladmin ping -hdb --silent; do sleep 1; done'
                }

                docker.image("node:${NODE_VERSION_NUMBER}").inside("--link ${c.id}:${mysql_host} --env HOME=${WORKSPACE} --env ConnectionStrings__StatePersistence='${mysql_connection_string}'") {
                  mysql_exit_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit > process_engine_runtime_integration_tests_mysql.txt", returnStatus: true);

                  mysql_testresults = sh(script: "cat process_engine_runtime_integration_tests_mysql.txt", returnStdout: true).trim();
                  junit 'process_engine_runtime_integration_tests_mysql.xml'
                }
              }

              sh('cat process_engine_runtime_integration_tests_mysql.txt');

              mysql_test_failed = mysql_exit_code > 0;
            }
          }
          post {
            always {
              script {
                cleanup_workspace();
              }
            }
          }
        }
        stage('PostgreSQL') {
          agent {
            label 'any-docker && process-engine-tests'
          }
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('post_build');

            script {
              def postgres_host = "postgres";
              def postgres_username = "admin";
              def postgres_password = "admin";
              def postgres_database = "processengine";

              def postgres_settings = "--env POSTGRES_USER=${postgres_username} --env POSTGRES_PASSWORD=${postgres_password} --env POSTGRES_DB=${postgres_database}";

              def db_database_host_correlation = "process_engine__correlation_repository__host=${postgres_host}";
              def db_database_host_cronjob_history = "process_engine__cronjob_history_repository__host=${postgres_host}";
              def db_database_host_external_task = "process_engine__external_task_repository__host=${postgres_host}";
              def db_database_host_process_model = "process_engine__process_model_repository__host=${postgres_host}";
              def db_database_host_flow_node_instance = "process_engine__flow_node_instance_repository__host=${postgres_host}";

              def db_environment_settings = "${db_database_host_correlation} ${db_database_host_cronjob_history} ${db_database_host_external_task} ${db_database_host_process_model} ${db_database_host_flow_node_instance}";

              def npm_test_command = "node ./node_modules/.bin/cross-env NODE_ENV=test-postgres JUNIT_REPORT_PATH=process_engine_runtime_integration_tests_postgres.xml CONFIG_PATH=config API_ACCESS_TYPE=internal ${db_environment_settings} ./node_modules/.bin/mocha -t 20000 test/**/*.js test/**/**/*.js";

              docker.image('postgres:11').withRun("${postgres_settings}") { c ->

                docker.image('postgres:11').inside("--link ${c.id}:${postgres_host}") {
                  sh "while ! pg_isready --host ${postgres_host} --username ${postgres_username} --dbname ${postgres_database}; do sleep 1; done"
                };

                docker.image("node:${NODE_VERSION_NUMBER}").inside("--link ${c.id}:${postgres_host} --env PATH=$PATH:/$WORKSPACE/node_modules/.bin") {
                  postgres_exit_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit > process_engine_runtime_integration_tests_postgres.txt", returnStatus: true);

                  postgres_testresults = sh(script: "cat process_engine_runtime_integration_tests_postgres.txt", returnStdout: true).trim();
                  junit 'process_engine_runtime_integration_tests_postgres.xml'
                };

              };

              sh('cat process_engine_runtime_integration_tests_postgres.txt');

              postgres_test_failed = postgres_exit_code > 0;
            }
          }
          post {
            always {
              script {
                cleanup_workspace();
              }
            }
          }
        }
        stage('SQLite') {
          agent {
            label 'any-docker && process-engine-tests'
          }
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('post_build');

            script {
              def junit_report_path = 'JUNIT_REPORT_PATH=process_engine_runtime_integration_tests_sqlite.xml';
              def config_path = 'CONFIG_PATH=/usr/src/app/config';
              def api_access_mode = '--env API_ACCESS_TYPE=internal ';

              def db_storage_folder_path = "$WORKSPACE/process_engine_databases";
              def db_storage_path_correlation = "process_engine__correlation_repository__storage=$db_storage_folder_path/correlation.sqlite";
              def db_storage_path_cronjob_history = "process_engine__cronjob_history_repository__storage=$db_storage_folder_path/cronjob_history.sqlite";
              def db_storage_path_external_task = "process_engine__external_task_repository__storage=$db_storage_folder_path/external_task.sqlite";
              def db_storage_path_process_model = "process_engine__process_model_repository__storage=$db_storage_folder_path/process_model.sqlite";
              def db_storage_path_flow_node_instance = "process_engine__flow_node_instance_repository__storage=$db_storage_folder_path/flow_node_instance.sqlite";

              def db_environment_settings = "jenkinsDbStoragePath=${db_storage_folder_path} ${db_storage_path_cronjob_history} ${db_storage_path_correlation} ${db_storage_path_external_task} ${db_storage_path_process_model} ${db_storage_path_flow_node_instance}";

              def npm_test_command = "node ./node_modules/.bin/cross-env NODE_ENV=test-sqlite JUNIT_REPORT_PATH=process_engine_runtime_integration_tests_sqlite.xml CONFIG_PATH=config API_ACCESS_TYPE=internal ${db_environment_settings} ./node_modules/.bin/mocha -t 20000 test/**/*.js test/**/**/*.js";

              docker.image("node:${NODE_VERSION_NUMBER}").inside("--env PATH=$PATH:/$WORKSPACE/node_modules/.bin") {
                sqlite_exit_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit > process_engine_runtime_integration_tests_sqlite.txt", returnStatus: true);

                sqlite_testresults = sh(script: "cat process_engine_runtime_integration_tests_sqlite.txt", returnStdout: true).trim();
                junit 'process_engine_runtime_integration_tests_sqlite.xml'
              };

              sh('cat process_engine_runtime_integration_tests_sqlite.txt');

              sqlite_tests_failed = sqlite_exit_code > 0;
            }
          }
        }
        stage('Lint sources') {
          steps {
            sh('npm run lint')
          }
        }
      }
    }
    stage('Check test results & notify Slack') {
      steps {
        script {
          if (sqlite_tests_failed || postgres_test_failed || mysql_test_failed) {
            currentBuild.result = 'FAILURE';

            if (mysql_test_failed) {
              echo "MySQL tests failed";
            }
            if (postgres_test_failed) {
              echo "PostgreSQL tests failed";
            }
            if (sqlite_tests_failed) {
              echo "SQLite tests failed";
            }
          } else {
            currentBuild.result = 'SUCCESS';
            echo "All tests succeeded!"
          }

          // Failure to send the slack message should not result in build failure.
          try {
            def mysql_report = create_summary_from_test_log(mysql_testresults, mysql_test_failed, 'MySQL');
            def postgres_report = create_summary_from_test_log(postgres_testresults, postgres_test_failed, 'PostgreSQL');
            def sqlite_report = create_summary_from_test_log(sqlite_testresults, sqlite_tests_failed, 'SQLite');

            def full_report = "${mysql_report}\\n\\n${postgres_report}\\n\\n${sqlite_report}"

            def some_tests_failed = mysql_test_failed || postgres_test_failed || sqlite_tests_failed

            slack_send_summary(full_report, some_tests_failed)
          } catch (Exception error) {
            echo "Failed to send slack report: $error";
          }
        }
      }
    }
    stage('Commit & tag version') {
      when {
        allOf {
          expression {
            currentBuild.result == 'SUCCESS'
          }
          anyOf {
            branch "master"
            branch "beta"
            branch "develop"
          }
        }
      }
      steps {
        unstash('package_json')

        withCredentials([
          usernamePassword(credentialsId: 'process-engine-ci_github-token', passwordVariable: 'GH_TOKEN', usernameVariable: 'GH_USER')
        ]) {
          // does not change the version, but commit and tag it
          sh('node ./node_modules/.bin/ci_tools commit-and-tag-version --only-on-primary-branches')

          sh('node ./node_modules/.bin/ci_tools update-github-release --only-on-primary-branches --use-title-and-text-from-git-tag');
        }

        stash(includes: 'package.json', name: 'package_json')
      }
    }
    stage('Publish') {
      parallel {
        stage('Publish npm package') {
          when {
            expression {
              currentBuild.result == 'SUCCESS'
            }
          }
          steps {
            unstash('post_build')
            unstash('package_json')

            nodejs(configId: env.NPM_RC_FILE, nodeJSInstallationName: env.NODE_JS_VERSION) {
              sh('node ./node_modules/.bin/ci_tools publish-npm-package --create-tag-from-branch-name')
            }
          }
        }
        stage('Windows') {
          when {
            allOf {
              expression {
                currentBuild.result == 'SUCCESS'
              }
              anyOf {
                branch "master"
                branch "beta"
                branch "develop"
              }
            }
          }
          stages {
            stage('Build Windows Installer') {
              when {
                allOf {
                  expression {
                    currentBuild.result == 'SUCCESS'
                  }
                  anyOf {
                    branch "master"
                    branch "beta"
                    branch "develop"
                  }
                }
              }
              agent {
                label 'windows'
              }
              steps {
                unstash('package_json')

                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  bat('node --version')

                  sh('npm ci')
                  sh('node ./node_modules/.bin/ci_tools npm-install-only --except-on-primary-branches @process-engine/ @essential-projects/')

                  bat('npm run build')
                  bat('npm rebuild')

                  bat('npm run create-executable-windows')
                }

                bat("$INNO_SETUP_ISCC /DProcessEngineRuntimeVersion=$full_release_version_string installer\\inno-installer.iss")

                stash(includes: "installer\\Output\\*.exe", name: 'windows_installer_results')
              }
            }
            stage('Publish as GitHub Release') {
              when {
                allOf {
                  expression {
                    currentBuild.result == 'SUCCESS'
                  }
                  anyOf {
                    branch "master"
                    branch "beta"
                    branch "develop"
                  }
                }
              }
              steps {
                unstash('package_json')
                unstash('windows_installer_results')

                withCredentials([
                  usernamePassword(credentialsId: 'process-engine-ci_github-token', passwordVariable: 'GH_TOKEN', usernameVariable: 'GH_USER')
                ]) {
                  sh("""
                  node ./node_modules/.bin/ci_tools update-github-release \
                                                    --assets installer/Output/*.exe
                  """);
                }
              }
            }
          }
        }
      }
    }
    stage('Cleanup') {
      steps {
        script {
          // this stage just exists, so the cleanup-work that happens in the post-script
          // will show up in its own stage in Blue Ocean
          sh(script: ':', returnStdout: true);
        }
      }
    }
  }
  post {
    always {
      script {
        cleanup_workspace();
      }
    }
  }
}
