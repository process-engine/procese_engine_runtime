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
def slack_send_summary(testlog, test_failed, database_type) {
  def passing_regex = /\d+ passing/;
  def failing_regex = /\d+ failing/;
  def pending_regex = /\d+ pending/;

  def passing_matcher = testlog =~ passing_regex;
  def failing_matcher = testlog =~ failing_regex;
  def pending_matcher = testlog =~ pending_regex;

  def passing = passing_matcher.count > 0 ? passing_matcher[0] : '0 passing';
  def failing = failing_matcher.count > 0 ? failing_matcher[0] : '0 failing';
  def pending = pending_matcher.count > 0 ? pending_matcher[0] : '0 pending';

  def color_string     =  '"color":"good"';
  def markdown_string  =  '"mrkdwn_in":["text","title"]';
  def title_string     =  "\"title\":\":white_check_mark: Process Engine Runtime Integration Tests against ${database_type} for ${BRANCH_NAME} Succeeded!\"";
  def result_string    =  "\"text\":\"${passing}\\n${failing}\\n${pending}\"";
  def action_string    =  "\"actions\":[{\"name\":\"open_jenkins\",\"type\":\"button\",\"text\":\"Open this run\",\"url\":\"${RUN_DISPLAY_URL}\"}]";

  if (test_failed == true) {
    color_string = '"color":"danger"';
    title_string =  "\"title\":\":boom: Process Engine Runtime Integration Tests against ${database_type} for ${BRANCH_NAME} Failed!\"";
  }

  slackSend(attachments: "[{$color_string, $title_string, $markdown_string, $result_string, $action_string}]");
}

def slack_send_testlog(testlog) {
  withCredentials([string(credentialsId: 'slack-file-poster-token', variable: 'SLACK_TOKEN')]) {

    def requestBody = [
      "token=${SLACK_TOKEN}",
      "content=${testlog}",
      "filename=process_engine_runtime_integration_tests.txt",
      "channels=process-engine_ci"
    ];

    httpRequest(
      url: 'https://slack.com/api/files.upload',
      httpMode: 'POST',
      contentType: 'APPLICATION_FORM',
      requestBody: requestBody.join('&')
    );
  }
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
    stage('prepare') {
      steps {
        script {
          raw_package_version = sh(script: 'node --print --eval "require(\'./package.json\').version"', returnStdout: true)
          package_version = raw_package_version.trim()
          echo("Package version is '${package_version}'")

          branch = BRANCH_NAME;
          branch_is_master = branch == 'master';
          branch_is_develop = branch == 'develop';

          if (branch_is_master) {
            full_release_version_string = "${package_version}";
          } else {
            full_release_version_string = "${package_version}-pre-b${BUILD_NUMBER}";
          }

          // When building a non master or develop branch the release will be a draft.
          release_will_be_draft = !branch_is_master && !branch_is_develop;

          echo("Branch is '${branch}'")
        }
        nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
          sh('node --version')
          sh('npm install -g mocha cross-env')
          sh('npm install')
          sh('npm run build')
          sh('npm rebuild')
        }

        archiveArtifacts('package-lock.json')

        stash(includes: '*, **/**', name: 'post_build');
      }
    }
    stage('Process Engine Runtime Tests') {
      parallel {
        stage('SQLite') {
          agent any
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('post_build');

            script {

              // image.inside mounts the current Workspace as the working directory in the container
              def junit_report_path = 'JUNIT_REPORT_PATH=process_engine_runtime_integration_tests.xml';
              def config_path = 'CONFIG_PATH=/usr/src/app/config';
              def api_access_mode = '--env API_ACCESS_TYPE=internal ';

              // SQLite Config
              def db_storage_folder_path = "$WORKSPACE/process_engine_databases";
              def db_storage_path_correlation = "process_engine__correlation_repository__storage=$db_storage_folder_path/correlation.sqlite";
              def db_storage_path_external_task = "process_engine__external_task_repository__storage=$db_storage_folder_path/external_task.sqlite";
              def db_storage_path_process_model = "process_engine__process_model_repository__storage=$db_storage_folder_path/process_model.sqlite";
              def db_storage_path_flow_node_instance = "process_engine__flow_node_instance_repository__storage=$db_storage_folder_path/flow_node_instance.sqlite";

              def db_environment_settings = "jenkinsDbStoragePath=${db_storage_folder_path} ${db_storage_path_correlation} ${db_storage_path_external_task} ${db_storage_path_process_model} ${db_storage_path_flow_node_instance}";

              def npm_test_command = "node ./node_modules/.bin/cross-env NODE_ENV=test-sqlite JUNIT_REPORT_PATH=process_engine_runtime_integration_tests.xml CONFIG_PATH=config API_ACCESS_TYPE=internal ${db_environment_settings} mocha -t 200000 test/**/*.js test/**/**/*.js";

              docker.image("node:${NODE_VERSION_NUMBER}").inside("--env PATH=$PATH:/$WORKSPACE/node_modules/.bin") {
                sqlite_exit_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit > process_engine_runtime_integration_tests.txt", returnStatus: true);

                sqlite_testresults = sh(script: "cat process_engine_runtime_integration_tests.txt", returnStdout: true).trim();
                junit 'process_engine_runtime_integration_tests.xml'
              };

              sh('cat process_engine_runtime_integration_tests.txt');

              sqlite_tests_failed = sqlite_exit_code > 0;
            }
          }
        }
        stage('PostgreSQL') {
          agent any
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('post_build');

            script {
              // Postgres Config
              def postgres_host = "postgres";
              def postgres_username = "admin";
              def postgres_password = "admin";
              def postgres_database = "processengine";

              def postgres_settings = "--env POSTGRES_USER=${postgres_username} --env POSTGRES_PASSWORD=${postgres_password} --env POSTGRES_DB=${postgres_database}";

              def db_database_host_correlation = "process_engine__correlation_repository__host=${postgres_host}";
              def db_database_host_external_task = "process_engine__external_task_repository__host=${postgres_host}";
              def db_database_host_process_model = "process_engine__process_model_repository__host=${postgres_host}";
              def db_database_host_flow_node_instance = "process_engine__flow_node_instance_repository__host=${postgres_host}";

              def db_environment_settings = "${db_database_host_correlation} ${db_database_host_external_task} ${db_database_host_process_model} ${db_database_host_flow_node_instance}";

              def npm_test_command = "node ./node_modules/.bin/cross-env NODE_ENV=test-postgres JUNIT_REPORT_PATH=process_engine_runtime_integration_tests.xml CONFIG_PATH=config API_ACCESS_TYPE=internal ${db_environment_settings} mocha -t 200000 test/**/*.js test/**/**/*.js";

              docker.image('postgres:11').withRun("${postgres_settings}") { c ->

                docker.image('postgres:11').inside("--link ${c.id}:${postgres_host}") {
                  sh "while ! pg_isready --host ${postgres_host} --username ${postgres_username} --dbname ${postgres_database}; do sleep 1; done"
                };

                docker.image("node:${NODE_VERSION_NUMBER}").inside("--link ${c.id}:${postgres_host} --env PATH=$PATH:/$WORKSPACE/node_modules/.bin") {
                  postgres_exit_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit > process_engine_runtime_integration_tests.txt", returnStatus: true);

                  postgres_testresults = sh(script: "cat process_engine_runtime_integration_tests.txt", returnStdout: true).trim();
                  junit 'process_engine_runtime_integration_tests.xml'
                };

              };

              sh('cat process_engine_runtime_integration_tests.txt');

              postgres_test_failed = postgres_exit_code > 0;
            }
          }
        }
      }
    }
    stage('Check test results') {
      steps {
        script {
          if (sqlite_tests_failed || postgres_test_failed) {
            currentBuild.result = 'FAILURE';

            if (sqlite_tests_failed) {
              echo "SQLite tests failed";
            }
            if (postgres_test_failed) {
              echo "PostgreSQL tests failed";
            }
          } else {
            echo "All tests succeeded!"
          }
        }
      }
    }
    stage('Send Test Results to Slack') {
      steps {
        script {
          // Failure to send the slack message should not result in build failure.
          try {
            slack_send_summary(sqlite_testresults, sqlite_tests_failed, 'SQLite');
            slack_send_testlog(sqlite_testresults);
          } catch (Exception error) {
            echo "Failed to send slack report: $error";
          }

          // Failure to send the slack message should not result in build failure.
          try {
            slack_send_summary(postgres_testresults, postgres_test_failed, 'PostgreSQL');
            slack_send_testlog(postgres_testresults);
          } catch (Exception error) {
            echo "Failed to send slack report: $error";
          }
        }
      }
    }
    stage('Build Windows Installer') {
      when {
        expression {
          currentBuild.result == 'SUCCESS' &&
          (branch_is_master ||
          branch_is_develop)
        }
      }
      agent {
        label 'windows'
      }
      steps {

        nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
          bat('node --version')
          bat('npm install')
          bat('npm run build')
          bat('npm rebuild')

          bat('npm run create-executable-windows')
        }

        bat("$INNO_SETUP_ISCC /DProcessEngineRuntimeVersion=$full_release_version_string installer\\inno-installer.iss")

        stash(includes: "installer\\Output\\Install ProcessEngine Runtime v${full_release_version_string}.exe", name: 'windows_installer_exe')
      }
    }
    stage('publish') {
      when {
        expression {
          currentBuild.result == 'SUCCESS'
        }
      }
      steps {
        script {
          def new_commit = env.GIT_PREVIOUS_COMMIT != GIT_COMMIT;

          if (branch_is_master) {
            if (new_commit) {
              script {
                // let the build fail if the version does not match normal semver
                def semver_matcher = package_version =~ /\d+\.\d+\.\d+/;
                def is_version_not_semver = semver_matcher.matches() == false;
                if (is_version_not_semver) {
                  error('Only non RC Versions are allowed in master')
                }
              }

              def raw_package_name = sh(script: 'node --print --eval "require(\'./package.json\').name"', returnStdout: true).trim();
              def current_published_version = sh(script: "npm show ${raw_package_name} version", returnStdout: true).trim();
              def version_has_changed = current_published_version != raw_package_version;

              if (version_has_changed) {
                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  sh('node --version')
                  sh('npm publish --ignore-scripts')
                }
              } else {
                println 'Skipping publish for this version. Version unchanged.'
              }
            }

          } else {
            // when not on master, publish a prerelease based on the package version, the
            // current git commit and the build number.
            // the published version gets tagged as the branch name.
            def first_seven_digits_of_git_hash = GIT_COMMIT.substring(0, 8);
            def publish_version = "${package_version}-${first_seven_digits_of_git_hash}-b${BUILD_NUMBER}";
            def publish_tag = branch.replace("/", "~");

            nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
              sh('node --version')
              sh("npm version ${publish_version} --allow-same-version --force --no-git-tag-version ")
              sh("npm publish --tag ${publish_tag} --ignore-scripts")
            }
          }
        }
      }
    }
    stage('publish github release') {
      when {
        expression {
          currentBuild.result == 'SUCCESS' &&
          (branch_is_master ||
          branch_is_develop)
        }
      }
      steps {

        unstash('windows_installer_exe')

        withCredentials([
          string(credentialsId: 'process-engine-ci_token', variable: 'RELEASE_GH_TOKEN')
        ]) {
          script {

            def create_github_release_command = 'create-github-release ';
            create_github_release_command += 'process-engine ';
            create_github_release_command += 'process_engine_runtime ';
            create_github_release_command += "${full_release_version_string} ";
            create_github_release_command += "${branch} ";
            create_github_release_command += "${release_will_be_draft} ";
            create_github_release_command += "${!branch_is_master} ";
            create_github_release_command += "installer/Output/Install\\ ProcessEngine\\ Runtime\\ v${full_release_version_string}.exe";

            sh(create_github_release_command);
          }
        }
      }
    }
    stage('cleanup') {
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
