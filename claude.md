# Claude Code — n8n Workflow Builder

## Purpose

This project uses Claude Code with the **n8n-mcp MCP server** and **n8n-skills** to build high-quality, production-ready workflows in the user's n8n Cloud instance.

## n8n Instance

- **URL**: https://techbrain.app.n8n.cloud
- **API base**: https://techbrain.app.n8n.cloud/api/v1

---

## Tools Available

### n8n-mcp MCP Server
Exposes 20 tools in two tiers:

**Tier 1 — Always available (no API key needed)**
| Tool | Use for |
|---|---|
| `tools_documentation` | **Call this first** — loads best practices into context |
| `search_nodes` | Find nodes by keyword; use `source: 'all'` and `includeExamples: true` |
| `get_node` | Node details — use `detail: 'standard'` (default ~5KB) not `full` (~100KB) unless necessary |
| `validate_node` | Validate a node config; `mode: 'minimal'` for speed, `mode: 'full'` with `profile: 'runtime'` before deploy |
| `validate_workflow` | Validate full workflow JSON including AI agent connections and expression syntax |
| `search_templates` | Search 2,709 templates — always try this before building from scratch |
| `get_template` | Retrieve complete workflow JSON for a template |

**Tier 2 — Workflow management (requires n8n API key)**
| Tool | Use for |
|---|---|
| `n8n_list_workflows` | List workflows with filtering |
| `n8n_get_workflow` | Get a workflow (`structure` mode for topology, `minimal` for ID/name) |
| `n8n_create_workflow` | Create a new workflow |
| `n8n_update_partial_workflow` | **Primary update tool** — batch diff operations (add/remove nodes, connections, activate). 99% success rate. |
| `n8n_update_full_workflow` | Full workflow replacement (use sparingly) |
| `n8n_delete_workflow` | Permanent deletion |
| `n8n_validate_workflow` | Validate a deployed workflow by ID |
| `n8n_autofix_workflow` | Auto-repair common errors in a deployed workflow |
| `n8n_test_workflow` | Trigger test execution |
| `n8n_executions` | List, get, or delete executions |
| `n8n_deploy_template` | Deploy a template directly from n8n.io with auto-fix |
| `n8n_workflow_versions` | Version history and rollback |
| `n8n_health_check` | Check API connectivity |

### n8n-skills
Seven skills that guide correct usage of the MCP tools. They activate automatically by keyword:

| Skill | Covers |
|---|---|
| **n8n MCP Tools Expert** | Which tool to use for which task; `nodeType` format rules |
| **n8n Workflow Patterns** | 5 proven architectural patterns (webhook, HTTP, database, AI agent, scheduled) |
| **n8n Node Configuration** | Property dependency cascades; AI connection types |
| **n8n Expression Syntax** | `{{$json}}`, `$node`, `$now`; webhook data lives at `$json.body.*` |
| **n8n Validation Expert** | Validation loop; error catalog; auto-sanitization behavior |
| **n8n Code JavaScript** | `$input.all()`, return format `[{json:{}}]`; top error patterns |
| **n8n Code Python** | No external libraries — use JS instead for 95% of cases |

---

## Execution Rules

- **Silent execution** — call MCP tools without narrating ("Let me search..." is bad). Respond only after all tools complete.
- **Parallel by default** — call independent tools simultaneously in one batch.
- **Batch updates** — group all `n8n_update_partial_workflow` operations into a single call.
- **Templates first, always** — run `search_templates` before building any workflow from scratch.
- **Call `tools_documentation()` at the start** of any complex workflow build session.

---

## Workflow Build Process

1. Run `tools_documentation()` to load current best practices
2. Run `search_templates` — use a template if one fits
3. Identify the trigger (webhook, schedule, manual, app event)
4. Search for needed nodes with `search_nodes` + `get_node`
5. Build in order: trigger → process → output → error handling
6. Validate each node with `validate_node(mode='minimal')` then `mode='full', profile='runtime'`
7. Validate the full workflow with `validate_workflow()`
8. Deploy with `n8n_create_workflow` or `n8n_update_partial_workflow`
9. Post-deploy: run `n8n_validate_workflow` + `n8n_autofix_workflow`
10. Test with `n8n_test_workflow` before activating

---

## Critical Gotchas

- **`nodeType` format differs by context**: use `nodes-base.slack` for `search_nodes`/`validate_node`, but `n8n-nodes-base.slack` inside workflow JSON
- **`addConnection` parameters** in `n8n_update_partial_workflow` must be four separate strings (`source`, `target`, `sourcePort`, `targetPort`) — NOT an object
- **IF node connections** require `branch: "true"` or `branch: "false"` — omitting this merges both paths onto the same output
- **Webhook data in expressions**: always `$json.body.field`, not `$json.field`
- **Code node return format**: must be `[{json: {...}}]`
- **Never trust defaults** — always set every parameter that controls behavior explicitly
- **n8n Cloud webhooks**: after API-based workflow updates, toggle the workflow off/on in the UI to re-register webhook URLs

---

## Workflow Quality Standards

1. **Clear names** — describe what the workflow does, e.g. "Demo Caffe — Process Phone Order"
2. **Sticky notes** — add one at the top: purpose, trigger, dependencies
3. **Error handling** — wire error outputs on HTTP requests, DB writes, and external API calls
4. **Named credentials** — never hardcode secrets; always use n8n credential references
5. **Focused nodes** — one node = one responsibility
6. **Meaningful node names** — rename every node from its default

---

## Connected Services

| Service | Purpose |
|---|---|
| Supabase | Database (orders, users, sessions, sheets) |
| Twilio | SMS and inbound phone call handling |
| ElevenLabs | Conversational AI voice agent (Demo Caffe Order Bot) |
| Google Sheets | Data display for dashboard users |
