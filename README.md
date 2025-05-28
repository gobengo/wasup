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

## FAQ

### How do I link `wasup` to local repo?

After you clone this git repoistory and do `npm install`,
then run [`npm link`](https://docs.npmjs.com/cli/v9/commands/npm-link) to set `wasup` on your shell `PATH` to be the script in your clone.

### What do I set for `$WAS` in the above examples?

Run <https://github.com/did-coop/wallet-attached-storage-server>

Then e.g.
```
WAS=http://localhost:8080
```

### How do I generate an identity file to use with `--identity` and sign WAS requests?

```shell
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_was_test
```
