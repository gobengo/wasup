#!/usr/bin/env node --no-warnings

import { parseArgs } from 'node:util'
import dedent from 'dedent'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { SshpkSigner } from '@data.pub/did-sshpk'
import sshpk from "sshpk"
import type { ISigner } from "./types.ts"
import { StorageClient } from '@wallet.storage/fetch-client'
import type { IResourceInSpace, IResponse, ISpace } from '@wallet.storage/fetch-client/types'
import { detectFileMime } from 'mime-detect'
import { buffer } from 'node:stream/consumers'

class WasFetchCli {
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
      await this.fetch({ args: argv.slice(2), values })
    }
  }

  async fetch(options: {
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
        body: {
          type: 'string',
          short: 'b',
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
        method: {
          type: "string",
          short: "m",
          default: "GET",
        },
        verbose: {
          type: 'boolean',
          short: 'v',
        },
      },
      allowPositionals: true,
    })

    const explicitContentType = upArgs.values['content-type'] ?? upArgs.values['ct']
    const pathToKey = upArgs.values.identity
    const method = upArgs.values.method ?? 'GET'
    const pathToKeyExists = typeof pathToKey === "string" && existsSync(pathToKey.toString())
    let signer: ISigner | undefined
    if (pathToKeyExists) {
      const keyBuffer = readFileSync(pathToKey)
      const privateKey = sshpk.parsePrivateKey(keyBuffer, undefined, {
        passphrase: options.env?.DATAPUB_SSH_PASSPHRASE
      })
      signer = await SshpkSigner.fromPrivateKey(privateKey)
    }

    if (upArgs.values.verbose) console.warn('signer', signer?.id)

    const [source] = upArgs.positionals

    if ( ! source) {
      console.debug(`Please provide a url to fetch`, '\n')
      console.debug(this.help)
      return
    }

    // URL fetch
    const sourceUrl = new URL(source)

    // WAS Storage Client we will use to PUT the local file to sourceUrl
    const storage = new StorageClient(new URL(sourceUrl.origin))

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
    const parsedSpaceResourcePath = ParsedSpaceResourcePath.fromUrl(sourceUrl)
    const spaceUrnUuid = `urn:uuid:${parsedSpaceResourcePath.space}` as const
    const upToSpace = storage.space(spaceUrnUuid)

    let resource: IResourceInSpace | ISpace
    if (typeof parsedSpaceResourcePath.name === 'undefined') {
      // just upload the space
      resource = upToSpace
    } else {
      // upload a resource within the space
      resource = upToSpace.resource(parsedSpaceResourcePath.name)
    }

    const bodyPath = upArgs.values.body
    const bodyPathStream = bodyPath && createReadStream(bodyPath)
    const contentType = bodyPath && (explicitContentType ?? await detectFileMime(bodyPath))
    const bodyBlob = bodyPathStream ? new Blob([await buffer(bodyPathStream)], { type: contentType}) : undefined

    let response: IResponse | undefined
    switch (method.toLowerCase()) {
      case 'delete':
        response = await resource.delete({ signer })
        break;
      case 'get':
        response = await resource.get({ signer })
        break;
      case 'post':
        response = await resource.put(bodyBlob, { signer })
        break;
      case 'put':
        response = await resource.put(bodyBlob, { signer })
        break;
    }
    if ( ! response?.ok) {
      throw new Error(`response is not ok`, {
        cause: {
          response,
          status: response?.status,
          bodyText: await response?.blob?.().then(b => b.text())
        }
      })
    }

    const responseText = await response.blob?.().then(b => b.text())
    if (responseText) console.debug(responseText)
  }

  get help() {
    // http://docopt.org/
    return dedent`
      # wasfetch

      Wallet Attached Storage Fetcher

      Usage:
        wasfetch [--identity ~/.ssh/space-controller-key] <url> [--method GET]
        wasfetch [--identity ~/.ssh/space-controller-key] <url> --method POST   --body <file> [--content-type <mime-type>]
        wasfetch [--identity ~/.ssh/space-controller-key] <url> --method PUT    --body <file> [--content-type <mime-type>]
        wasfetch [--identity ~/.ssh/space-controller-key] <url> --method DELETE
        wasfetch -h | --help

      Options:
        -b --body           Path to the file to use as request body in POST, PUT requests.
        -ct --content-type  Content type of the request body.
        -h --help           Show this screen.
        -i --identity       Path to the Ed25519 SSH key to use for authentication.
                            Generate an identity with \`ssh-keygen -t ed25519\`.
        -m --method         HTTP method to use. [default: GET]
    `
  }
}

export default async function cli(...argv: string[]) {
  await new WasFetchCli().invoke(...argv)
}

if (import.meta.url === 'file://' + process.argv[1]) {
  await cli(...process.argv)
}
