 #!/bin/bash

if [[ $# -ne 2 ]]; then
  echo "Insufficient arguments."
  echo "Usage: $0 <release before this release> <this release>"
  echo "Both arguments are git tags."
  exit 1
fi

RELEASE_BEFORE_THIS_RELEASE=$1
THIS_RELEASE=$2

OUTPUT="releasenotes_$THIS_RELEASE.md"

cat <<EOF > $OUTPUT
# Release Notes ProcessEngine Runtime $THIS_RELEASE

This changelog _only_ covers the changes between [$RELEASE_BEFORE_THIS_RELEASE and $THIS_RELEASE](https://github.com/process-engine/process_engine_runtime/compare/$RELEASE_BEFORE_THIS_RELEASE...$THIS_RELEASE).

Also see the changelog of the previous version, [$RELEASE_BEFORE_THIS_RELEASE](https://github.com/process-engine/process_engine_runtime/releases/tag/$RELEASE_BEFORE_THIS_RELEASE).

## Major Features

**Some new major feature**:

Short description on that new feature.

**Another major feature**:

We can now write awesome changelogs.

## Other Features

- Note all notable, but not major features here.
- For example:
- Various style and layout fixes.

## Fixed Issues

<!--

Paste fixed issues here.

-->

## Full Changelog

<!--

Paste all merge commits here.

-->
EOF
