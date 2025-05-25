# `wasup`

[Wallet Attached Storage](https://wallet.storage/) Uploader

## Usage

`wasup --help` output:

```shell
# wasup

A tool that uploads to Wallet Attached Storage

Usage:
  wasup <path/to/file> <space-url> [--identity ~/.ssh/space-controller-key]
  wasup -h | --help

Options:
  -h --help     Show this screen.
  -i --identity Path to the Ed25519 SSH key to use for authentication.
                Generate an identity with `ssh-keygen -t ed25519`.
```

## Examples

```shell
wasup ./README.md $WAS/space/$SPACE/README.md --identity ~/.ssh/id_ed25519_was_test
```

### Upload a space, linkset, ACL, and HTML home page

See [./examples/acl-simple.sh](./examples/acl-simple.sh).
