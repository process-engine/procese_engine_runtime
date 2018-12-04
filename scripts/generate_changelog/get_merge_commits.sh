 #!/bin/bash

if [[ $# -ne 2 ]]; then
  echo "Insufficient arguments."
  echo "Usage: $0 <release before this release> <this release>"
  echo "Both arguments are git tags."
  exit 1
fi

RELEASE_BEFORE_THIS_RELEASE=$1
THIS_RELEASE=$2

OUTPUT="merge_commits_of_release.txt"

git log --merges --oneline $RELEASE_BEFORE_THIS_RELEASE..$THIS_RELEASE > $OUTPUT
