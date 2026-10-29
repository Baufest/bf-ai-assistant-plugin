# Mini Assistant Demos — ChatGPT Desktop Plugin

A personal [Agent Plugins 1.0.0](https://agent-plugins.org) package that lets ChatGPT Desktop run the mini-assistant demos: simulated Chipotle and Jumbo orders and Hotelbeds sandbox bookings. It connects to the public, OAuth-protected MCP app built and deployed from [Baufest/mini-assistant](https://github.com/Baufest/mini-assistant) (design: `docs/chatgpt/create-plugin.md`, decision: `Architecture/ADR-0014-chatgpt-desktop-plugin-oauth.md`).

```text
.
├── .agents/plugins/marketplace.json   # repo marketplace; loads the plugin from this repo's root
├── plugin.json                        # portable manifest + extensions.com.openai presentation
├── mcp.json                           # hotelbeds, chipotle and jumbo remote MCP servers (OAuth)
└── skills/
    ├── demo-conventions/              # ask, "Otro", explicit approvals, simulated data
    ├── chipotle-order/
    ├── jumbo-order/
    └── hotelbeds-booking/
```

The plugin lives at the repository root, so the marketplace entry uses a Git `url` source (pinned to `main`) instead of a local path.

The package contains no credentials. The MCP URL and the public OAuth client ID `mini-assistant-chatgpt-desktop` are identifiers, not secrets.

## Prerequisites

1. The public MCP app `ca-mini-assistant-mcp-chatgpt` is deployed (mini-assistant runbook `docs/azure-deployment/full-deployment.md`, section 16) and its verification block passes.
2. Your GitHub login is in `MCP_OAUTH_ALLOWED_GITHUB_LOGINS`.
3. The three `url` values in [`mcp.json`](mcp.json) point to that app's host. Update them if the Container Apps environment changes.
4. ChatGPT Desktop with plugins available for your account.

## Install

1. In ChatGPT Desktop open **Plugins → Add → Add a marketplace** and paste `https://github.com/Baufest/bf-ai-assistant-plugin`.
   - Fallback: clone this repository and create a personal marketplace at `~/.agents/plugins/marketplace.json` with an entry whose `source` is `{ "source": "local", "path": "./<path-to-clone>" }` (relative to `~`, starting with `./`). Restart Desktop.
2. Open the **Baufest AI Assistant** marketplace in the Plugins Directory and install **Mini Assistant Demos**.
3. Connect each MCP server (`hotelbeds`, `chipotle`, `jumbo`) when asked: ChatGPT opens the MCP sign-in page, which sends you to GitHub. Authorize the GitHub OAuth App once; the next servers reuse the GitHub session.
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

- **Update:** change the package, bump `version` in `plugin.json`, push to `main`, refresh the marketplace in Desktop and restart it.
- **Remove:** uninstall the plugin from the Plugins Directory and remove the marketplace. Optionally revoke the GitHub OAuth App under GitHub **Settings → Applications → Authorized OAuth Apps**.

## Compatibility notes

- OAuth for each server is declared in `mcp.json` under `extensions["com.openai"].auth`, as ChatGPT requires. Strict Agent Plugins 1.0.0 clients treat server entries as closed objects, so other hosts may skip these server entries. The target host is ChatGPT Desktop only.
- The three servers share the same OAuth client and GitHub login but receive separate tokens, each bound to its own route.
- Server-side changes (MCP tools, OAuth, deployment) belong in Baufest/mini-assistant. Keep the skills aligned with its MCP tool names.
