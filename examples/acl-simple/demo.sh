#!/usr/bin/env bash
set -e # exit on error

DIR=$(realpath "$(dirname "${BASH_SOURCE[0]}")")
IDENTITY="$HOME/.ssh/id_ed25519_wasup_examples"
SPACE_UUID='1eb0be6a-94c6-496e-8efa-1f1487fdc7a0'
WAS=https://storage.bengo.is
SPACE="$WAS/space/$SPACE_UUID"

echo
echo "## Space"
echo
cat $DIR/space.json
echo
echo
wasup --content-type application/json $DIR/space.json "$SPACE" -i "$IDENTITY"

echo
echo "## Links"
echo
cat $DIR/links.json
echo
echo
wasup --content-type application/linkset+json $DIR/links.json "$SPACE"/links/ -i "$IDENTITY"

echo
echo "## ACL"
echo
cat $DIR/acl.json
echo
wasup --content-type application/ld+json $DIR/acl.json "$SPACE"/acl -i "$IDENTITY"

echo
echo "## index.html"
echo
cat $DIR/index.html
echo
wasup --content-type text/html $DIR/index.html "$SPACE"/ -i "$IDENTITY"
