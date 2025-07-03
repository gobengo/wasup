#!/usr/bin/env bash
set -e # exit on error

IDENTITY="$HOME/.ssh/id_ed25519_wasup_examples"
SPACE_UUID="${SPACE_UUID:-"$(uuidgen | tr "[:upper:]" "[:lower:]")"}" # generate a random UUID
WAS="${WAS:-https://you-server.com}"
SPACE_PATH=/space/$SPACE_UUID
SPACE="$WAS$SPACE_PATH"
DID_KEY="$(npx wasupdoc --controller "$IDENTITY" | jq -r .controller)"

# Space
npx wasup --content-type application/json /dev/stdin "$SPACE" -i "$IDENTITY" <<EOF
{
  "controller": "$DID_KEY",
  "link": "$SPACE_PATH/links"
}
EOF

# /links/ - Links including link to ACL
npx wasup --content-type application/linkset+json /dev/stdin "$SPACE"/links -i "$IDENTITY" <<EOF
{
  "linkset": [                                                             
    {                                                         
      "anchor": "$SPACE_PATH/",
      "acl": [
        {            
          "href": "$SPACE_PATH/acl"
        }
      ]
    }
  ]
}
EOF

# /acl - ACL
npx wasup --content-type application/json /dev/stdin "$SPACE"/acl -i "$IDENTITY" <<EOF
{
  "type": "PublicCanRead"
}
EOF

# / - HTML Homepage
npx wasup --content-type text/html /dev/stdin "$SPACE"/ -i "$IDENTITY" <<EOF
<!doctype html>
<h1>wasup/examples/acl-PublicCanRead.sh</h1>
<p>This is an example of a resource covered by an ACL of type PubliCanRead.</p>
EOF

curl $SPACE/
