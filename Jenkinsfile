#!/usr/bin/env groovy

def cleanup_workspace() {
  cleanWs()
  dir("${env.WORKSPACE}@tmp") {
    deleteDir()
  }
  dir("${env.WORKSPACE}@script") {
    deleteDir()
  }
  dir("${env.WORKSPACE}@script@tmp") {
    deleteDir()
  }
}

def cleanup_docker() {
  sh(script: "docker rmi ${server_image_id}");

  // Build stages in dockerfiles leave dangling images behind (see https://github.com/moby/moby/issues/34151).
  // Dangling images are images that are not used anywhere and don't have a tag. It is safe to remove them (see https://stackoverflow.com/a/45143234).
  // This removes all dangling images
  sh(script: "docker image prune --force");

  // Some Dockerfiles create volumes using the `VOLUME` command (see https://docs.docker.com/engine/reference/builder/#volume)
  // running the speedtests creates two dangling volumes. One is from postgres (which contains data), but i don't know about the other one (which is empty)
  // Dangling volumes are volumes that are not used anywhere. It is safe to remove them.
  // This removes all dangling volumes
  sh(script: "docker volume prune --force");
}

def slack_send_summary(testlog, test_failed) {
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
  def title_string     =  "\"title\":\":white_check_mark: Process Engine Runtime Integration Tests for ${env.BRANCH_NAME} Succeeded!\"";
  def result_string    =  "\"text\":\"${passing}\\n${failing}\\n${pending}\"";
  def action_string    =  "\"actions\":[{\"name\":\"open_jenkins\",\"type\":\"button\",\"text\":\"Open this run\",\"url\":\"${RUN_DISPLAY_URL}\"}]";

  if (test_failed == true) {
    color_string = '"color":"danger"';
    title_string =  "\"title\":\":boom: Process Engine Runtime Integration Tests for ${env.BRANCH_NAME} Failed!\"";
  }

  slackSend(attachments: "[{$color_string, $title_string, $markdown_string, $result_string, $action_string}]");
}

def slack_send_testlog(testlog) {
  withCredentials([string(credentialsId: 'slack-file-poster-token', variable: 'SLACK_TOKEN')]) {

    def requestBody = [
      "token=${SLACK_TOKEN}",
      "content=${testlog}",
      "filename=process_engine_integration_tests.txt",
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

          branch = env.BRANCH_NAME;
          branch_is_master = branch == 'master';
          branch_is_develop = branch == 'develop';

          if (branch_is_master) {
            full_release_version_string = "${package_version}";
          } else {
            full_release_version_string = "${package_version}-pre-b${env.BUILD_NUMBER}";
          }

          // When building a non master or develop branch the release will be a draft.
          release_will_be_draft = !branch_is_master && !branch_is_develop;

          echo("Branch is '${branch}'")
        }
        nodejs(configId: env.NPM_RC_FILE, nodeJSInstallationName: env.NODE_JS_VERSION) {
          sh('node --version')
          sh('npm install -g mocha cross-env')
          sh('npm install')
          sh('npm run build')
        }

        archiveArtifacts('package-lock.json')
      }
    }
    stage('Process Engine Runtime Tests') {
      steps {
        script {
          // image.inside mounts the current Workspace as the working directory in the container
          def junit_report_path = 'JUNIT_REPORT_PATH=report.xml';
          def config_path = 'CONFIG_PATH=/usr/src/app/config';
          def api_access_mode = '--env API_ACCESS_TYPE=internal ';

          // SQLite Config
          def db_storage_folder_path = "$WORKSPACE/process_engine_databases";
          def db_storage_path_correlation = "process_engine__correlation_repository__storage=$db_storage_folder_path/processengine.sqlite";
          def db_storage_path_external_task = "process_engine__external_task_repository__storage=$db_storage_folder_path/processengine.sqlite";
          def db_storage_path_process_model = "process_engine__process_model_repository__storage=$db_storage_folder_path/processengine.sqlite";
          def db_storage_path_flow_node_instance = "process_engine__flow_node_instance_repository__storage=$db_storage_folder_path/processengine.sqlite";
          def db_storage_path_timer = "process_engine__timer_repository__storage=$db_storage_folder_path/processengine.sqlite";

          def db_environment_settings = "${db_storage_path_correlation} ${db_storage_path_external_task} ${db_storage_path_process_model} ${db_storage_path_flow_node_instance} ${db_storage_path_timer}";

          def npm_test_command = "node ./node_modules/.bin/cross-env NODE_ENV=test JUNIT_REPORT_PATH=report.xml CONFIG_PATH=config API_ACCESS_TYPE=internal ${db_environment_settings} mocha -t 200000 test/**/*.js test/**/**/*.js";

          docker.image('node:8').inside("--env PATH=$PATH:/$WORKSPACE/node_modules/.bin") {
            error_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit > result.txt", returnStatus: true);
          };

          testresults = sh(script: "cat result.txt", returnStdout: true).trim();

          junit 'report.xml'

          test_failed = false;
          currentBuild.result = 'SUCCESS'
          if (error_code > 0) {
            test_failed = true;
            currentBuild.result = 'FAILURE'
          }

        }
      }
    }
    stage('Send Test Results to Slack') {
      steps {
        script {
          // Print the result to the jobs console
          println(testresults);
          // Failure to send the slack message should not result in build failure.
          try {
            slack_send_summary(testresults, test_failed);
            slack_send_testlog(testresults);
          } catch (Exception error) {
            echo "Failed to send slack report: $error";
          }
        }
      }
    }
    stage('publish') {
      steps {
        script {
          def new_commit = env.GIT_PREVIOUS_COMMIT != env.GIT_COMMIT;

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
                nodejs(configId: env.NPM_RC_FILE, nodeJSInstallationName: env.NODE_JS_VERSION) {
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
            def first_seven_digits_of_git_hash = env.GIT_COMMIT.substring(0, 8);
            def publish_version = "${package_version}-${first_seven_digits_of_git_hash}-b${env.BUILD_NUMBER}";
            def publish_tag = branch.replace("/", "~");

            nodejs(configId: env.NPM_RC_FILE, nodeJSInstallationName: env.NODE_JS_VERSION) {
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
        expression { branch_is_master || branch_is_develop }
      }
      steps {
        nodejs(configId: env.NPM_RC_FILE, nodeJSInstallationName: env.NODE_JS_VERSION) {
          dir('.ci-tools') {
            sh('npm install')
          }
          withCredentials([
            string(credentialsId: 'process-engine-ci_token', variable: 'RELEASE_GH_TOKEN')
          ]) {
            script {
              sh("node .ci-tools/publish-github-release.js ${full_release_version_string} ${full_release_version_string} ${branch} ${release_will_be_draft} ${!branch_is_master}");
            }
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
