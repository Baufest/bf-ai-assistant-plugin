# Mini Assistant Commerce — ChatGPT Desktop Plugin

This package discovers ready demo stores through one OAuth-protected MCP
connection, searches their catalogs and prepares a cart for **explicit checkout
on the web**. It does not contain a payment, order, or provider-specific
booking tool. Hotelbeds is treated like any other ready store.

> **Migration not yet activated.** The root `.app.json` references the
> operator's registered commerce connection, which is connected to the public
> MCP through OAuth. Tool calls and the packaged plugin still require
> interactive verification. The existing repository marketplace is pinned to
> the previous, three-connection package, which is compatible only with legacy
> server routes removed by the new upstream MCP. Do not switch the marketplace
> to this revision or claim the new plugin works until the checks below pass.

The [compatibility reference](docs/chatgpt-connector-compatibility.md) explains
the manifests, source evidence and limitations. The
[legacy README](https://github.com/Baufest/bf-ai-assistant-plugin/blob/93504bc611dd304002f64dea31e5abfd819d7539/README.md)
describes the pinned package; it does not describe the new commerce contract.

## What is staged

```text
.agents/plugins/marketplace.json   # pinned to the last legacy package commit
plugin.json                        # portable commerce manifest
.codex-plugin/plugin.json          # Codex/ChatGPT compatibility manifest
.app.json                          # operator-registered commerce connection
skills/commerce/SKILL.md           # one store-independent workflow
scripts/prepare-commerce.mjs       # creates an isolated local test marketplace
tests/                             # offline safety and package checks
```

Both manifests reference the root `.app.json`, which maps `commerce` to the
operator's registered technical ID. The helper can also produce a local copy
using an independently supplied ID. A registered ID may not be available to
other accounts or workspaces. IDs are identifiers, not OAuth credentials.
Never put tokens, keys, or client secrets in this repository, the command
arguments, or model context.

## Operator prerequisites

The following are **human-only dependencies**, not actions performed by this
repository:

1. Make sure a compatible public HTTPS OAuth MCP service and its aligned
   backend/web are deployed and healthy. Confirm the MCP resource is exactly
   `https://<public-mcp-host>/mcp/commerce`, not one of the removed legacy
   routes. Deployment and cloud configuration are outside this repository.
2. Verify that the MCP publishes resource and authorization metadata, offers
   PKCE `S256`, and authenticates an allowed GitHub identity. Its default
   predefined public client is `mini-assistant-chatgpt-desktop`, token
   authentication method `none`, and scope `demo`; use the actual deployed
   configuration if the client ID has been overridden. Never enter a client
   secret for this public client.
3. Ensure ChatGPT Desktop and custom MCP connections are available to the
   intended account or workspace. Connector permissions and accessibility
   must be verified there; do not assume another account can use your ID.

For the resource and authorization metadata check, replace the host in these
unauthenticated requests:

```powershell
curl.exe -fsS 'https://<public-mcp-host>/.well-known/oauth-protected-resource/mcp/commerce'
curl.exe -fsS 'https://<public-mcp-host>/.well-known/oauth-authorization-server'
```

Confirm that the first response's `resource` is the exact commerce URL and
that its authorization server matches the second response's `issuer`. The
authorization metadata must advertise `S256`, `none`, and scope `demo`. Stop
if the metadata or deployed client configuration does not match; do not
disable OAuth checks to proceed.

## Register and verify the single connection

1. Open [ChatGPT Plugins](https://chatgpt.com/plugins), choose **+ → Add custom
   MCP server**, and enter the deployed `https://<public-mcp-host>/mcp/commerce`
   URL. Under **Client registration**, use **User-Defined OAuth Client**, the
   deployed public client ID, an empty client secret, token auth method `none`,
   and scope `demo`. Use discovered endpoints and the redirect offered by
   ChatGPT. Review the warning and choose **Create as a plugin**.
2. Sign in through the configured GitHub OAuth flow. Inspect the connection's
   URL and discovered tools: `commerce_list_stores`,
   `commerce_search_products`, and, for an authorized delegated user,
   `commerce_prepare_cart`. The last is a mutation; a read-only credential must
   not expose or successfully invoke it. Do not bypass an authorization error.
3. Copy the `plugin_asdk_app_…` technical ID from the resulting browser URL.
   If attempting to reuse an existing connection, first verify in ChatGPT that
   its configured URL is actually `/mcp/commerce` and that the tools above are
   present. Retargeting an existing connection is not established by the
   official documentation; if the UI does not support it, create a new one.
   A metadata **Refresh** alone does not prove a URL change. Retargeting a
   legacy connection can also break the pinned legacy plugin, so prefer a new
   connection until migration is verified.

The operator registered and authorized the configured connection before adding
it to this package. The mapping itself does not authorize another account, and
the tool and installed-package checks below are still required.

## Prepare and install an isolated local test package

With Node.js 24.13.1, from this repository's root in PowerShell, set the
non-secret technical ID locally and use the exact verified URL:

```powershell
$env:CHATGPT_COMMERCE_APP_ID = '<copied technical ID>'
node .\scripts\prepare-commerce.mjs `
  --app-id $env:CHATGPT_COMMERCE_APP_ID `
  --commerce-url 'https://<public-mcp-host>/mcp/commerce' `
  --verified-connection
```

The command is offline: it checks the ID's shape and URL syntax but **cannot
verify that they belong together**. `--verified-connection` represents the
operator's confirmation, not an automated check. It creates the ignored
`.commerce-local` directory containing a plugin and its own marketplace; it
does not modify the existing marketplace, registered connections or user
configuration. If the directory exists, nothing is overwritten: inspect it
and either remove it yourself or use `--output .commerce-local-<name>`.

Add the generated local marketplace using a supported Codex installation:

```powershell
codex plugin marketplace add .\.commerce-local
codex plugin marketplace list
```

Restart ChatGPT Desktop, select **Mini Assistant Commerce (local)** in the
Plugins Directory, install **Mini Assistant Commerce**, connect the single
commerce connection, and start a new chat. Account and client availability may
differ.

If the CLI is unavailable, use OpenAI's
[manual personal marketplace](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually):

1. Copy `.commerce-local\plugin` into a **new** directory such as
   `$HOME\.codex\plugins\mini-assistant-commerce`. Do not overwrite an existing
   directory or plugin.
2. Add the entry below to the existing `plugins` array in
   `$HOME\.agents\plugins\marketplace.json`, preserving all existing entries
   and fields. If the file does not exist, create a personal marketplace as
   shown in OpenAI's instructions. The path is relative to `$HOME`, not to
   `.commerce-local`; adjust it if you chose a different destination.

   ```json
   {
     "name": "mini-assistant-commerce",
     "source": { "source": "local", "path": "./.codex/plugins/mini-assistant-commerce" },
     "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
     "category": "Productivity"
   }
   ```

3. Restart Desktop and install the plugin from the personal marketplace. Do not
   assume a change to the original `.commerce-local` directory updates the
   copied package.

## Acceptance checks before release

- List ready stores, including Hotelbeds **if it is ready**; a newly ready
  store must appear without editing the plugin. An archived or absent store
  must not be invented.
- Search a store, select real product and modifier IDs, and verify **Otro**
  collects alternative text and starts a new request rather than becoming an
  ID. No results must produce an open question, not an empty selector.
- Confirm read-only access cannot prepare a cart; test a failed sign-in and
  unavailable/forbidden tools without bypassing permissions.
- In a disposable test store with an authorized user, explicitly request a
  cart, review the returned lines, currency and total, and open the returned
  link. Payment requires the user's separate explicit action on that web page.
  Do not make a payment as part of an automated smoke test.
- In a controlled disposable test environment, simulate
  `CART_OUTCOME_UNKNOWN` and confirm there is no automatic retry; do not induce
  uncertain mutations on a live service. Verify that a chat cannot invoke
  legacy booking, order or payment tools.

Run offline repository checks with:

```powershell
node .\tests\coverage.mjs
git diff --check
```

The coverage command uses in-process V8 precise coverage with a conservative
nonblank-line metric and requires at least 90% for the setup script. It
requires Git and the pinned marketplace commit in local history, and makes no
network calls. It does not replace the human Desktop, OAuth, deployment,
permission and web-checkout checks above.

## Publishing after verification

Keep the current marketplace pin until the operator has verified the deployed
resource, the registered ID and the installed local package. Verify that the
configured connection is accessible and its workflows work for the intended
account or workspace; use an appropriate distribution configuration if a
different connection is required. Then, in a subsequent marketplace update,
change the entry's plugin name to `mini-assistant-commerce` and its `sha` to
that verified package commit. Never point the marketplace at an empty
`.app.json` or a legacy ID merely to make the manifest look configured.

Retain the old installation and connections until migration is verified; remove
them only when no longer needed. Reauthorization may be required after an MCP
restart because upstream OAuth sessions are in memory.
