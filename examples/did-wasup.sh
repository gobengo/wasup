#!/usr/bin/env bash
set -e # exit on error

IDENTITY="$HOME/.ssh/id_ed25519_wasup_examples"
SPACE_UUID="${SPACE_UUID:-"$(uuidgen | tr "[:upper:]" "[:lower:]")"}" # generate a random UUID
WAS="${WAS:-https://storage.bengo.is}"
SPACE_PATH=/space/$SPACE_UUID
SPACE="$WAS$SPACE_PATH"

function urlToDidWeb() {
  node /dev/stdin <<-'  EOF' "$1"
    const { positionals } = require('util').parseArgs({ strict: false });
    const url = new URL(positionals[0])
    const { host } = url
    const pathSegments = url.pathname.split('/')
    if (pathSegments.at(-1) !== 'did.json') {
    throw new Error('Path must end with did.json')
    }
    const pathToColonSegments = pathSegments.slice(0, pathSegments.length -1)
    const didWeb = `did:web:${encodeURIComponent(host)}${pathToColonSegments.join(':')}`
    console.debug(didWeb)
  EOF
}

SPACE_DID="$(urlToDidWeb $SPACE/did.json)"

# Space
SPACE=$(wasup --content-type application/json /dev/stdin "$SPACE" -i "$IDENTITY" <<EOF
{
  "link": "$SPACE_PATH/links"
}
EOF
)

# /links/ - Links including link to ACL
links=$(wasup --content-type application/linkset+json /dev/stdin "$SPACE"/links -i "$IDENTITY" <<EOF
{
  "linkset": [          
    {
      "anchor": "$SPACE_PATH/",
      "acl": [
        {
          "href": "$SPACE_PATH/acl"
        }
      ]
    },                                                   
    {                                                         
      "anchor": "$SPACE_PATH/did.json",
      "acl": [
        {
          "href": "$SPACE_PATH/acl"
        }
      ]
    }
  ]
}
EOF
)

# /acl - ACL
acl=$(wasup --content-type application/json /dev/stdin "$SPACE"/acl -i "$IDENTITY" <<EOF
{
  "type": "PublicCanRead"
}
EOF
)

# /did.json - DID Document
# inspired by <https://w3c-ccg.github.io/did-method-web/#example-example-did-web-did-document-using-an-ethereum-address>

didJson=$(wasup --content-type application/json /dev/stdin "$SPACE/did.json" -i "$IDENTITY" <<EOF
{
  "id": "$SPACE_DID",
  "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/secp256k1recovery-2020/v2"],
  "verificationMethod": [{
      "id": "#address-0",
      "type": "EcdsaSecp256k1RecoveryMethod2020",
      "blockchainAccountId": "eip155:1:0x89a932207c485f85226d86f7cd486a89a24fcc12"
  }],
  "authentication": [
      "#address-0"
  ]
}
EOF
)

resolverUrl="https://dev.uniresolver.io/#$SPACE_DID"

# / - HTML Homepage
SPACE_HOME=$(wasup --content-type text/html /dev/stdin "$SPACE"/ -i "$IDENTITY" <<EOF
<!doctype html>
<h1>wasup/examples/did-simple.sh</h1>
<h2>DID</h2>
<p>
  My DID is
  <a href="$resolverUrl">
  $SPACE_DID
  </a>.
</p>
<p>
  My DID Document is at
  <a href="did.json">
    did.json
  </a>.
</p>
EOF
)

echo "$SPACE_DID"
1>&2 echo resolve at "$resolverUrl"

1>&2 echo home page "$SPACE_HOME"
