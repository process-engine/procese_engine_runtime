 #!/bin/bash

if [[ -z "$GITHUB_AUTH" ]]; then
  echo "Please supply GitHub authorization in form of:"
  echo "GITHUB_AUTH=\"USERNAME:TOKEN\" $0 $@"
  exit 1
fi

INPUT="merge_commits_of_release.txt"

if [[ ! -e "$INPUT" ]]; then
  echo "Input file $INPUT does not exist."
  exit 1
fi

egrep -o "^[a-z0-9]{8} " $INPUT | \
xargs git show | \
egrep "(Issue|Clos|Fix)(es|s)?" | \
egrep -o "#\d+" | \
sort | \
egrep -o "\d+" | \
xargs -n1 -I % sh -c 'curl -s -u $GITHUB_AUTH https://api.github.com/repos/process-engine/process_engine_runtime/issues/% | echo - \#% $(jq -r ".title")' > \
closed_issues
