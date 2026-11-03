# Commerce connector compatibility

## What this repository can establish

- The new package uses the same registered-app layout as the installed legacy
  package: portable `plugin.json` and the `.codex-plugin/plugin.json`
  compatibility fallback both reference the root `.app.json`. OpenAI documents
  the portable extension as preferred and the Codex manifest as a fallback;
  its scaffold can start with an empty `apps` object.
  [Package your plugin](https://developers.openai.com/plugins/build/plugins#plugin-structure)
- OpenAI's documented custom-MCP flow creates a connection in ChatGPT and
  supplies its `plugin_asdk_app_…` technical ID. A local `.app.json` mapping
  is not itself a registration, and an ID's availability to other accounts
  or workspaces must not be assumed.
  [Create and test a plugin locally](https://developers.openai.com/plugins/build/plugins#create-and-test-a-plugin-locally-with-an-mcp-server)
- OpenAI documents **Refresh** for changed server metadata. The cited
  documentation does not establish that an existing connection can be
  retargeted to a different URL in place. If the ChatGPT UI supports doing
  that, verify the resulting URL and tools; otherwise register a new
  connection. Never assume one of the three legacy IDs points to commerce.
  [Refresh metadata](https://developers.openai.com/plugins/deploy/connect-chatgpt#refresh-metadata)
- The repo marketplace is pinned to the last legacy package commit. Git-backed
  marketplace sources support a `sha` selector; this avoids automatically
  distributing the new package before its connection and workflows are
  interactively verified.
  [Marketplace metadata](https://developers.openai.com/plugins/build/plugins#marketplace-metadata)
  Legacy routes may nevertheless stop working when the upstream server is
  migrated. The installed Desktop client's support for this pin has not been
  tested here; an older client might skip the marketplace entry. Retargeting a
  legacy connection can independently break its old plugin even if the package
  stays pinned.

## Current upstream contract

At mini-assistant commit
[`e49c033`](https://github.com/Baufest/mini-assistant/tree/e49c0335be9fbb41271d8557138c86954448e01b),
the generic OAuth resource is `/mcp/commerce`. It exposes
`commerce_list_stores` and `commerce_search_products`; authenticated,
authorized users can also use `commerce_prepare_cart`. The generic search and
cart calls require a returned `storeId`. A separate read-only credential cannot
prepare carts. Hotelbeds is an ordinary dynamically discovered store, not a
separate booking connector. The server returns a cart URL; payment is an
explicit web action. See the
[MCP tools](https://github.com/Baufest/mini-assistant/blob/e49c0335be9fbb41271d8557138c86954448e01b/mcp/src/commerce/interfaces/mcp/tools.ts),
[MCP README](https://github.com/Baufest/mini-assistant/blob/e49c0335be9fbb41271d8557138c86954448e01b/mcp/README.md)
and [dynamic contract](https://github.com/Baufest/mini-assistant/blob/e49c0335be9fbb41271d8557138c86954448e01b/docs/multidemo/multidemo-contracts.md#11-dynamic-demo-contracts-adr-0015).
This source evidence alone does not establish deployment health or that a
ChatGPT account can invoke the current public endpoint.

The upstream OAuth server advertises resource-specific protected-resource
metadata, scope `demo`, a public client using token authentication `none`, and
PKCE `S256`. The default client ID is `mini-assistant-chatgpt-desktop` but can
be overridden in server configuration. Its authorization remains bound to
the resource and verified GitHub identity; do not put credentials in the
plugin or send them to the model.
[OAuth configuration](https://github.com/Baufest/mini-assistant/blob/e49c0335be9fbb41271d8557138c86954448e01b/mcp/src/config/oauth.ts),
[metadata implementation](https://github.com/Baufest/mini-assistant/blob/e49c0335be9fbb41271d8557138c86954448e01b/mcp/src/interfaces/http/oauth/oauth-http.ts),
[OpenAI authentication requirements](https://developers.openai.com/plugins/build/auth).

## Remaining verification

The operator has registered and authorized the connection referenced by the
root manifest. The packaging helper validates syntax and requires a human
confirmation; it does not contact ChatGPT or verify that an ID is live,
accessible, or bound to the supplied URL. Run the Desktop tool and installed
package checks in the [README](../README.md), and verify availability for the
intended accounts or workspaces before publishing the new package.
