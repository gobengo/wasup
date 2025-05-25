#!/usr/bin/env bash
set -e # exit on error

IDENTITY="$HOME/.ssh/id_ed25519_wasup_examples"
SPACE_UUID="${SPACE_UUID:-"$(uuidgen | tr "[:upper:]" "[:lower:]")"}" # generate a random UUID
WAS="${WAS:-https://storage.bengo.is}"
SPACE_PATH=/space/$SPACE_UUID
SPACE="$WAS$SPACE_PATH"

# Space
wasup --content-type application/json /dev/stdin "$SPACE" -i "$IDENTITY" <<EOF
{
  "controller": "did:key:z6MkmoJbuoR9TSY4evRTLAtw6nN44RtCtqFhxdv72PhEa91X",
  "link": "$SPACE_PATH/links/"
}
EOF

# /links/ - Links including link to ACL
wasup --content-type application/linkset+json /dev/stdin "$SPACE"/links/ -i "$IDENTITY" <<EOF
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
wasup --content-type application/ld+json /dev/stdin "$SPACE"/acl -i "$IDENTITY" <<EOF
{
  "authorization": [
    {
      "agentClass": "http://xmlns.com/foaf/0.1/Agent",         
      "accessTo": [
        "$SPACE_PATH/"
      ],                                                           
      "mode": [
        "Read"
      ],
      "@type": [
        "http://www.w3.org/ns/auth/acl#Authorization"
      ]
    }             
  ],
  "@context": [
    "http://www.w3.org/ns/auth/acl#"
  ]
}
EOF

# / - HTML Homepage
wasup --content-type text/html /dev/stdin "$SPACE"/ -i "$IDENTITY" <<EOF
<!doctype html>
<h1>wasup/examples/acl-simple.sh</h1>
<p>This is a simple example of something uploaded from wasup</p>
EOF

curl $SPACE/