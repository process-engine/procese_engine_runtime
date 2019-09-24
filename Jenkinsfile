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

def buildIsRequired = true

pipeline {
  agent any
  options {
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '20'))
  }
  tools {
    nodejs "node-lts"
  }
  environment {
    NPM_RC_FILE = 'process-engine-ci-token'
    NODE_JS_VERSION = 'node-lts'
  }

  stages {
    stage('Check if build is required') {
      steps {
        script {
          // Taken from https://stackoverflow.com/questions/37755586/how-do-you-pull-git-committer-information-for-jenkins-pipeline
          sh 'git --no-pager show -s --format=\'%an\' > commit-author.txt'
          def commitAuthorName = readFile('commit-author.txt').trim()

          def ciUserName = "admin"

          echo(commitAuthorName)
          echo("Commiter is process-engine-ci: ${commitAuthorName == ciUserName}")

          buildIsRequired = commitAuthorName != ciUserName

          if (!buildIsRequired) {
            echo("Commit was made by process-engine-ci. Skipping build.")
          }
        }
      }
    }
    stage('Prepare version') {
      when {
        expression {buildIsRequired == true}
      }
      steps {
        nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
          // ci_tools must be installed for the scripts to work.
          sh('npm install @process-engine/ci_tools')
          // Prepares the new version (alpha, beta, stable), but does not yet commit it.
          sh('node ./node_modules/.bin/ci_tools prepare-version --allow-dirty-workdir')

          // We need this on the other agents, so we stash this.
          stash(includes: 'package.json', name: 'package_json')

          // TODO: variable `full_release_version_string` is still needed for windows release stage
          script {
            raw_package_version = sh(script: 'node --print --eval "require(\'./package.json\').version"', returnStdout: true)
            full_release_version_string = raw_package_version.trim()
            echo("full_release_version_string is '${full_release_version_string}'")
          }
        }
      }
    }
    stage('Installation & Build') {
      when {
        expression {buildIsRequired == true}
      }
      parallel {
        stage('Linux') {
          agent {
            label 'master'
          }
          stages {
            stage('Install Dependencies') {
              steps {
                unstash('package_json');

                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  sh('npm ci')
                  sh('node ./node_modules/.bin/ci_tools npm-install-only --except-on-primary-branches @process-engine/ @essential-projects/')
                }
                archiveArtifacts('package-lock.json')
              }
            }
            stage('Build Sources') {
              when {
                expression {buildIsRequired == true}
              }
              steps {
                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  sh('npm run build')
                  sh('npm rebuild')
                }
              }
            }
            stage('stash sources') {
              when {
                expression {buildIsRequired == true}
              }
              steps {
                stash(includes: '*, **/**', name: 'linux_sources');
              }
            }
          }
        }
        stage('MacOS') {
          agent {
            label 'macos'
          }
          stages {
            stage('Install Dependencies') {
              steps {
                unstash('package_json');

                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  sh('npm ci')
                  sh('node ./node_modules/.bin/ci_tools npm-install-only --except-on-primary-branches @process-engine/ @essential-projects/')
                }
                archiveArtifacts('package-lock.json')
              }
            }
            stage('Build Sources') {
              when {
                expression {buildIsRequired == true}
              }
              steps {
                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  sh('npm run build')
                  sh('npm rebuild')
                }
              }
            }
            stage('stash sources') {
              when {
                expression {buildIsRequired == true}
              }
              steps {
                stash(includes: '*, **/**', name: 'macos_sources');
              }
            }
          }
        }
        stage('Windows') {
          agent {
            label 'windows'
          }
          stages {
            stage('Install Dependencies') {
              steps {
                unstash('package_json');

                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  // TODO: this throws an error on Windows
                  // bat('npm ci')
                  // bat('node ./node_modules/.bin/ci_tools npm-install-only --except-on-primary-branches @process-engine/ @essential-projects/')
                  bat('npm install')
                }
                archiveArtifacts('package-lock.json')
              }
            }
            stage('Build Sources') {
              when {
                expression {buildIsRequired == true}
              }
              steps {
                nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
                  bat('npm run build')
                  bat('npm rebuild')
                }
              }
            }
            stage('stash sources') {
              when {
                expression {buildIsRequired == true}
              }
              steps {
                stash(includes: '*, **/**', name: 'windows_sources');
              }
            }
          }
        }
      }
    }
    stage('Process Engine Runtime Tests') {
      when {
        // expression {buildIsRequired == true}
        expression {false == true}
      }
      parallel {
        stage('MySQL') {
          agent {
            label 'any-docker && process-engine-tests'
          }
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('linux_sources');

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
        }
        stage('PostgreSQL') {
          agent {
            label 'any-docker && process-engine-tests'
          }
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('linux_sources');

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
        }
        stage('SQLite') {
          agent {
            label 'any-docker && process-engine-tests'
          }
          options {
            skipDefaultCheckout()
          }
          steps {
            unstash('linux_sources');

            script {
              def node_env = 'NODE_ENV=test-sqlite';
              def api_mode = 'API_ACCESS_TYPE=internal ';
              def junit_report_path = 'JUNIT_REPORT_PATH=process_engine_runtime_integration_tests_sqlite.xml';
              def config_path = 'CONFIG_PATH=config';

              def node_env_settings = "${node_env} ${api_mode} ${junit_report_path} ${config_path}"

              def npm_test_command = "node ./node_modules/.bin/cross-env ${node_env_settings} ./node_modules/.bin/mocha -t 20000 test/**/*.js test/**/**/*.js";

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
      when {
        // expression {buildIsRequired == true}
        expression {false == true}
      }
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
          expression {buildIsRequired == true}
          // expression {currentBuild.result == 'SUCCESS'}
          // anyOf {
          //   branch "master"
          //   branch "beta"
          //   branch "develop"
          // }
        }
      }
      steps {
        withCredentials([
          usernamePassword(credentialsId: 'process-engine-ci_github-token', passwordVariable: 'GH_TOKEN', usernameVariable: 'GH_USER')
        ]) {
          // Creates a tag from the current version and commits that tag.
          // sh('node ./node_modules/.bin/ci_tools commit-and-tag-version --only-on-primary-branches')
          sh('node ./node_modules/.bin/ci_tools commit-and-tag-version')
        }
      }
    }
    stage('Publish to npm') {
      // when {
      //   allOf {
      //     expression {buildIsRequired == true}
      //     expression { currentBuild.result == 'SUCCESS'}
      //   }
      // }
      steps {
        unstash('linux_sources')
        unstash('package_json')

        nodejs(configId: env.NPM_RC_FILE, nodeJSInstallationName: env.NODE_JS_VERSION) {
          sh('node ./node_modules/.bin/ci_tools publish-npm-package --create-tag-from-branch-name')
        }
      }
    }
    stage('Create GitHub Release parts') {
      when {
        allOf {
          expression {buildIsRequired == true}
          // expression {currentBuild.result == 'SUCCESS'}
          // anyOf {
          //   branch "master"
          //   branch "beta"
          //   branch "develop"
          // }
        }
      }
      parallel {
        stage('Create tarball from linux sources') {
          agent {
            label 'linux'
          }
          steps {
            unstash('linux_sources');
            script {
              echo('Creating tarball from compiled sources')
              // Excludes the following files and folders: .git, .github, .gitignore, .npmignore, Dockerfile, Jenkinsfile
              sh('tar -czvf process_engine_runtime_linux.tar.gz bin bpmn config dist node_modules scripts sequelize src test .eslintignore .eslintrc LICENSE package-lock.json package.json README.md reinstall.sh tsconfig.json')

              stash(includes: 'process_engine_runtime_linux.tar.gz', name: 'linux_application_package');
              archiveArtifacts('process_engine_runtime_linux.tar.gz')
            }
          }
        }
        stage('Create tarball from macos sources') {
          agent {
            label 'macos'
          }
          steps {
            unstash('macos_sources');
            script {
              sh('pwd')
              echo('Creating tarball from compiled sources')
              // Excludes the following files and folders: .git, .github, .gitignore, .npmignore, Dockerfile, Jenkinsfile
              sh('tar -czvf process_engine_runtime_macos.tar.gz bin bpmn config dist node_modules scripts sequelize src test .eslintignore .eslintrc LICENSE package-lock.json package.json README.md reinstall.sh tsconfig.json')

              stash(includes: 'process_engine_runtime_macos.tar.gz', name: 'macos_application_package');
              archiveArtifacts('process_engine_runtime_macos.tar.gz')
            }
          }
        }
        stage('Create zipfile from windows sources') {
          agent {
            label 'macos'
          }
          steps {
            // NOTE: Zipping these files on the windows slave takes ridiculously long; like over an HOUR.
            // So the Windows Slave just has to provide the sources (i.e. run npm intall, npm build and npm rebuild) and then we let one of the faster slaves to all the zipping.
            // To prevent collision with the 'Create tarball from macos sources' step, we do this in a subfolder.
            sh('mkdir windows_sources')
            dir('windows_sources') {
              sh('pwd')
              echo('Creating zip from compiled sources')
              unstash('windows_sources');

              sh('ls -lahS .')

              // Excludes the following files and folders: .git, .github, .gitignore, .npmignore, Dockerfile, Jenkinsfile
              sh('zip -r process_engine_runtime_windows.zip bin bpmn config dist node_modules scripts sequelize src test .eslintignore .eslintrc LICENSE package-lock.json package.json README.md reinstall.sh tsconfig.json')

              stash(includes: 'process_engine_runtime_windows.zip', name: 'windows_application_package');
              archiveArtifacts('process_engine_runtime_windows.zip')
            }
            // script {
              // powershell('$PSVersionTable.PSVersion');
              // Excludes the following files and folders: .git, .github, .gitignore, .npmignore, Dockerfile, Jenkinsfile
              // powershell('Compress-Archive -Path bin, bpmn, config, dist, node_modules, scripts, sequelize, src, test, .eslintignore, .eslintrc, LICENSE, package-lock.json, package.json, README.md, reinstall.sh, tsconfig.json -CompressionLevel NoCompression -DestinationPath process_engine_runtime_windows.zip')

              // stash(includes: 'process_engine_runtime_windows.zip', name: 'windows_application_package');
              // archiveArtifacts('process_engine_runtime_windows.zip')
            // }
          }
        }
        // stage('Build Windows Installer') {
        //   agent {
        //     label 'windows'
        //   }
        //   steps {
        //     unstash('package_json')

        //     nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
        //       unstash('windows_sources');
        //       bat('npm run create-executable-windows')
        //     }

        //     bat("$INNO_SETUP_ISCC /DProcessEngineRuntimeVersion=$full_release_version_string installer\\inno-installer.iss")

        //     stash(includes: "installer\\Output\\*.exe", name: 'windows_installer_results')
        //   }
        // }
      }
    }
    stage('Publish GitHub Release') {
      when {
        allOf {
          expression {buildIsRequired == true}
          // expression {currentBuild.result == 'SUCCESS'}
          // anyOf {
          //   branch "master"
          //   branch "beta"
          //   branch "develop"
          // }
        }
      }
      steps {
        // unstash('windows_installer_results')
        unstash('linux_application_package');
        unstash('macos_application_package');
        unstash('windows_application_package');

        withCredentials([
          usernamePassword(credentialsId: 'process-engine-ci_github-token', passwordVariable: 'GH_TOKEN', usernameVariable: 'GH_USER')
        ]) {
          //sh('node ./node_modules/.bin/ci_tools update-github-release --only-on-primary-branches --use-title-and-text-from-git-tag');
          // sh("""
          // node ./node_modules/.bin/ci_tools update-github-release --assets "installer/Output/*.exe" --assets "process_engine_runtime_macos.tar.gz" --assets "process_engine_runtime_linux.tar.gz" --assets "process_engine_runtime_windows.zip"
          // """);
          sh('ls -laih')
          sh('node ./node_modules/.bin/ci_tools update-github-release --use-title-and-text-from-git-tag');
          sh("""
          node ./node_modules/.bin/ci_tools update-github-release --assets process_engine_runtime_macos.tar.gz --assets process_engine_runtime_linux.tar.gz --assets "process_engine_runtime_windows.zip"
          """);
        }
      }
    }
    // stage('Build Docker') {
    //   when {
    //     allOf {
    //       expression {buildIsRequired == true}
    //       expression {currentBuild.result == 'SUCCESS'}
    //       anyOf {
    //         branch "master"
    //         branch "beta"
    //         branch "develop"
    //       }
    //     }
    //   }
    //   steps {
    //     script {
    //       def docker_image_name = '5minds/process_engine_runtime';
    //       def docker_node_version = '10-alpine';

    //       def process_engine_version = full_release_version_string

    //       full_image_name = "${docker_image_name}:${process_engine_version}";

    //       sh("docker build --build-arg NODE_IMAGE_VERSION=${docker_node_version} \
    //                       --build-arg PROCESS_ENGINE_VERSION=${process_engine_version} \
    //                       --build-arg BUILD_DATE=${BUILD_TIMESTAMP} \
    //                       --no-cache \
    //                       --tag ${full_image_name} .");



    //       docker_image = docker.image(full_image_name);
    //     }
    //   }
    // }
    // stage('Publish Docker') {
    //   when {
    //     allOf {
    //       expression {buildIsRequired == true}
    //       expression {currentBuild.result == 'SUCCESS'}
    //       anyOf {
    //         branch "master"
    //         branch "beta"
    //         branch "develop"
    //       }
    //     }
    //   }
    //   steps {
    //     script {
    //       try {
    //         def process_engine_version = full_release_version_string

    //         withDockerRegistry([ credentialsId: "5mio-docker-hub-username-and-password" ]) {

    //           docker_image.push("${process_engine_version}");
    //         }
    //       } finally {
    //         sh("docker rmi ${full_image_name} || true");
    //       }
    //     }
    //   }
    // }
    // Performs cleanup for all workspaces on every agent the runtime builds use.
    // Each stage has a dummy step, so that it shows up as a stage in BlueOcean.
    stage('Cleanup') {
      when {
        expression {buildIsRequired == true}
      }
      parallel {
        stage('master') {
          agent {label 'master'}
          steps {
            script {
              echo('Cleaning up master');
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
        stage('macos') {
          agent {label 'macos'}
          steps {
            script {
              echo('Cleaning up macos slave');
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
        stage('windows') {
          agent {label 'windows'}
          steps {
            script {
              echo('Cleaning up windows slave');
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
        stage('linux slave') {
          // Note that there are actually two slaves with that label.
          // So it CAN happen, that this will not run on the actual slave that was used by the integration tests.
          agent {label 'process-engine-tests'}
          steps {
            script {
              echo('Cleaning up linux integrationtest slave');
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
      }
    }
  }
}
