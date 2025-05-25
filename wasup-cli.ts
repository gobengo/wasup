import { parseArgs } from 'node:util'
import dedent from 'dedent'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { SshpkSigner } from '@data.pub/did-sshpk'
import sshpk from "sshpk"
import type { ISigner } from "./types.ts"
import { StorageClient } from '@wallet.storage/fetch-client'
import { blob, buffer, text } from 'node:stream/consumers'
import type { IResourceInSpace, ISpace } from '@wallet.storage/fetch-client/types'
import { detectFileMime } from 'mime-detect'

class WasCli {
  async invoke(...argv: string[]) {
    const { values, positionals } = parseArgs({
      args: argv.slice(0, 3),
      options: {
        help: {
          type: 'boolean',
          short: 'h',
          default: false,
        },
        version: {
          type: 'boolean',
          short: 'v',
          default: false,
        },
      },
      strict: false,
      allowPositionals: true,
    })

    if (values.help) {
      console.log(this.help)
    } else {
      await this.up({ args: argv.slice(2), values })
    }
  }

  async up(options: {
    args: string[]
    values: {}
    env?: Record<string, string>
  }) {
    const { args } = options
    const { values } = options
    const upArgs = parseArgs({
      args,
      options: {
        help: {
          type: 'boolean',
          short: 'h',
          default: false,
        },
        // abbreviation for --content-type
        'ct': {
          type: 'string',
        },
        'content-type': {
          type: 'string',
        },
        // path to ssh key
        identity: {
          type: 'string',
          short: 'i',
        },
        verbose: {
          type: 'boolean',
          short: 'v',
        }
      },
      allowPositionals: true,
    })

    const explicitContentType = upArgs.values['content-type'] ?? upArgs.values['ct']
    const pathToKey = upArgs.values.identity
    const pathToKeyExists = typeof pathToKey === "string" && existsSync(pathToKey.toString())
    let signer: ISigner | undefined
    if (pathToKeyExists) {
      const keyBuffer = readFileSync(pathToKey)
      const privateKey = sshpk.parsePrivateKey(keyBuffer, undefined, {
        passphrase: options.env?.DATAPUB_SSH_PASSPHRASE
      })
      signer = await SshpkSigner.fromPrivateKey(privateKey)
    }

    if (upArgs.values.verbose) console.debug('signer', signer?.id)

    const [fromPath, upTo] = upArgs.positionals

    if ( ! fromPath) {
      console.debug(`Please provide a path to the file to upload.`, '\n')
      console.debug(this.help)
      throw new Error(`Please provide a path to the file to upload.`)
    }
    if ( ! upTo) {
      console.debug(`Please provide a URL to PUT the file to.`, '\n')
      console.debug(this.help)
      throw new Error(`Please provide a URL to PUT the file to.`)
    }

    // URL to PUT to
    const upToUrl = new URL(upTo)

    // WAS Storage Client we will use to PUT the local file to upToUrl
    const storage = new StorageClient(new URL(upToUrl.origin))

    // result of parsing /space/:space/:name{.*}
    class ParsedSpaceResourcePath {
      space: string
      name?: string
      static fromUrl(url: URL) {
        const pattern = /\/space\/(?<space>[^/]+)(\/(?<name>.*))?/
        const pathname = url.pathname
        const match = url.pathname.match(pattern)
        const space = match?.groups?.space
        if ( ! space) throw new Error(`No space id found in URL: ${url}`)
        const name = match?.groups?.name
        const parsed = new ParsedSpaceResourcePath
        parsed.name = name
        parsed.space = space
        return parsed
      }
    }
    const parsedSpaceResourcePath = ParsedSpaceResourcePath.fromUrl(upToUrl)
    const spaceUrnUuid = `urn:uuid:${parsedSpaceResourcePath.space}` as const
    const upToSpace = storage.space(spaceUrnUuid)

    const fromPathStream = createReadStream(fromPath)
    const contentType = explicitContentType ?? await detectFileMime(fromPath)
    const fromPathBlob = new Blob([await buffer(fromPathStream)], { type: contentType})

    let resource: IResourceInSpace | ISpace
    if (typeof parsedSpaceResourcePath.name === 'undefined') {
      // just upload the space
      resource = upToSpace
    } else {
      // upload a resource within the space
      resource = upToSpace.resource(parsedSpaceResourcePath.name)
    }

    const responseToPut = await resource.put(fromPathBlob, { signer })
    if ( ! responseToPut.ok) {
      throw new Error(`response to PUT is not ok`, {
        cause: {
          response: responseToPut,
          status: responseToPut.status,
          bodyText: await responseToPut.blob?.().then(b => b.text())
        }
      })
    }

    console.debug(upToUrl.toString())

    const responseText = await responseToPut.blob?.().then(b => b.text())
    if (responseText) console.debug(responseText)
  }

  get help() {
    // http://docopt.org/
    return dedent`
      # wasup

      A tool that uploads to Wallet Attached Storage

      Usage:
        wasup <path/to/file> <space-url> [--identity ~/.ssh/space-controller-key]
        wasup -h | --help

      Options:
        -h --help     Show this screen.
        -i --identity Path to the Ed25519 SSH key to use for authentication.
                      Generate an identity with \`ssh-keygen -t ed25519\`.
    `
  }
}

export default async function cli(...argv: string[]) {
  await new WasCli().invoke(...argv)
}
