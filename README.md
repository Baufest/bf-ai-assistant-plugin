# Mini Assistant Demos — ChatGPT Desktop Plugin

A personal [Agent Plugins 1.0.0](https://agent-plugins.org) package that lets ChatGPT Desktop run the mini-assistant demos: simulated Chipotle and Jumbo orders and Hotelbeds sandbox bookings. It connects to the public, OAuth-protected MCP app built and deployed from [Baufest/mini-assistant](https://github.com/Baufest/mini-assistant) (design: `docs/chatgpt/create-plugin.md`, decision: `Architecture/ADR-0014-chatgpt-desktop-plugin-oauth.md`).

```text
.
├── .agents/plugins/marketplace.json   # repo marketplace; loads the plugin from this repo's root
├── plugin.json                        # portable manifest + extensions.com.openai (presentation, apps)
├── .codex-plugin/plugin.json          # compatibility manifest read by ChatGPT Desktop (skills, apps, interface)
├── .app.json                          # maps chipotle, jumbo and hotelbeds to their registered ChatGPT connections
└── skills/
    ├── demo-conventions/              # ask, "Otro", explicit approvals, simulated data
    ├── chipotle-order/
    ├── jumbo-order/
    └── hotelbeds-booking/
```

The plugin lives at the repository root, so the marketplace entry uses a Git `url` source (pinned to `main`) instead of a local path.

The package contains no credentials. The `plugin_asdk_app_…` connection IDs in `.app.json` are identifiers, not secrets.

## Registered connections

ChatGPT Desktop does not register remote, OAuth-protected MCP servers from a plugin's `mcp.json`. Each MCP route is instead registered once as a ChatGPT connection, and `.app.json` maps it into the plugin:

| `.app.json` key | Connection name | MCP server URL (`<host>` = public MCP app) |
|---|---|---|
| `chipotle` | Mini Assistant Chipotle | `https://<host>/mcp/chipotle` |
| `jumbo` | Mini Assistant Jumbo | `https://<host>/mcp/jumbo` |
| `hotelbeds` | Mini Assistant Hotelbeds | `https://<host>/mcp` |

To (re)create a connection: open [ChatGPT Plugins](https://chatgpt.com/plugins) → **+** → **Add custom MCP server**, enter the URL, and under **Client registration** choose **User-Defined OAuth Client** with client ID `mini-assistant-chatgpt-desktop`, an empty client secret and token endpoint auth method `none`; keep default scope `demo` and the discovered endpoints. Accept the risk warning, select **Create as a plugin**, then copy the `plugin_asdk_app_…` ID from the browser URL into `.app.json` and bump `version`.

Connections are personal to the ChatGPT account that created them; another user must register their own and use a fork with their IDs.

## Prerequisites

1. The public MCP app `ca-mini-assistant-mcp-chatgpt` is deployed (mini-assistant runbook `docs/azure-deployment/full-deployment.md`, section 16) and its verification block passes.
2. Your GitHub login is in `MCP_OAUTH_ALLOWED_GITHUB_LOGINS`.
3. The three connections above exist in your ChatGPT account and their IDs match `.app.json`. Recreate them if the Container Apps host changes.
4. ChatGPT Desktop with plugins available for your account.

## Install

1. In ChatGPT Desktop open **Plugins → Add → Add a marketplace** and paste `https://github.com/Baufest/bf-ai-assistant-plugin`.
   - Fallback: clone this repository and create a personal marketplace at `~/.agents/plugins/marketplace.json` with an entry whose `source` is `{ "source": "local", "path": "./<path-to-clone>" }` (relative to `~`, starting with `./`). Restart Desktop.
2. Open the **Baufest AI Assistant** marketplace in the Plugins Directory and install **Mini Assistant Demos**.
3. Connect each connection (Mini Assistant Chipotle, Jumbo and Hotelbeds) when asked: ChatGPT opens the MCP sign-in page, which sends you to GitHub. Authorize the GitHub OAuth App once; the next connections reuse the GitHub session.
4. Start a new chat and select the plugin with `@Mini Assistant Demos`.

A restart or redeploy of the MCP app clears its in-memory sessions and tokens; ChatGPT then asks you to reconnect.

## Test script

Run each scenario in a new chat. Every state-changing call must be preceded by a summary and an explicit "yes" from you, and the result must say simulated (commerce) or sandbox (Hotelbeds).

| # | Prompt | Expected |
|---|---|---|
| 1 | `Quiero un burrito de carnitas y una Diet Coke en Chipotle` | Asks for required burrito options, quotes both lines, asks for approval, places one simulated order and shows its reference. |
| 2 | `Quiero 1 kg de arroz y 1 kg de tomate en Jumbo` | Offers numbered brand options plus "Otro", converts 1 kg to 1000 g, quotes, asks for approval, places one simulated order. Choose "Otro" once to check it triggers a new search. |
| 3 | `Busco un hotel en Barcelona del <date> al <date> para dos adultos` | Resolves the destination, lists hotels plus "Otro", quotes, collects guest names, asks for approval, creates one sandbox booking. For activities, preconfirm and reconfirm are approved separately. |

Negative checks: answer "no" at an approval and confirm nothing is created; remove your login from the allowlist and confirm the next tool call fails until you are added back.

## Update and remove

- **Update:** change the package, bump `version` in both `plugin.json` and `.codex-plugin/plugin.json`, push to `main`, refresh the marketplace in Desktop and restart it.
- **Remove:** uninstall the plugin from the Plugins Directory, remove the marketplace and delete the three Mini Assistant connections in ChatGPT Plugins. Optionally revoke the GitHub OAuth App under GitHub **Settings → Applications → Authorized OAuth Apps**.

## Compatibility notes

- ChatGPT Desktop reads `.codex-plugin/plugin.json`; root `plugin.json` carries the same `apps` reference under `extensions["com.openai"]` for portable hosts. Keep both manifests aligned.
- OAuth settings live in each registered connection, not in this repository. The three connections share the same OAuth client and GitHub login but receive separate tokens, each bound to its own route.
- Server-side changes (MCP tools, OAuth, deployment) belong in Baufest/mini-assistant. Keep the skills aligned with its MCP tool names.
