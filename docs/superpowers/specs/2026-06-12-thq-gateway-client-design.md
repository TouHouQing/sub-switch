# THQ Gateway Desktop Client Design

Date: 2026-06-12

## Goal

Convert the current multi-provider switcher into a desktop client for the THQ AI API Gateway at `sub.thqllm.com`.

The app should feel like a native control panel for the user's gateway account: users can register, log in, see balance and usage, inspect available models, recharge, review usage records, view orders, and apply the selected API key to supported local AI tools. Custom provider `base_url` editing is removed from the primary user flow.

## Confirmed Decisions

- Product direction: platform client, not only a light rebrand.
- Account mode: users register and log in with the THQ gateway account.
- Management API base: `https://sub.thqllm.com/api/v1`.
- Model request base URL: `https://sub.thqllm.com/v1`.
- API key selection: after login, load the user's keys and default to the first key.
- Empty key state: if the account has no API key, show an empty state and a create-key action. Do not auto-create keys.
- Recharge: support native order creation where practical, with browser handoff for payment pages and complex callbacks.

## Non-Goals

- Do not build a new gateway backend.
- Do not auto-create an API key on login.
- Do not expose arbitrary custom `base_url` editing in the normal flow.
- Do not make `/api/v1` the model call base URL.

## Product Shell

The main screen becomes a THQ gateway dashboard. The top-level app switcher remains available, but it changes meaning from "which provider list am I editing?" to "which local tool am I configuring?" Examples: Claude, Claude Desktop, Codex, Gemini, OpenCode, OpenClaw, and Hermes.

Before login, the app shows a native login/register experience.

After login, the dashboard shows:

- Account identity and gateway status.
- Connection state: connected, not configured, no API key, write failed, or gateway unreachable.
- Metric cards for account balance, today's usage, today's tokens, and cumulative usage.
- Quick actions: usage records, my orders, recharge, and refresh.
- Available models/channels list with search and refresh.
- Key management and logout entry points.

Existing provider CRUD, provider presets, and custom endpoint forms are hidden from the primary flow. If retained, they belong behind an explicit advanced/developer path.

## Data Boundaries

The app uses two separate gateway addresses:

1. Management API:
   `https://sub.thqllm.com/api/v1`

   Used for account, dashboard, keys, usage records, orders, plans, payment setup, and available channel metadata.

2. Model API:
   `https://sub.thqllm.com/v1`

   Used by local AI tools and OpenAI-compatible runtime requests, including `/v1/models`.

This separation is required. A probe showed `/v1/models` exists and returns `401` without an API key, while `/api/v1/models` returns `404`.

## Authentication

The desktop app adds a gateway client layer for:

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

The client stores:

- Access token.
- Refresh token.
- Token expiry.
- Current user.

All management API requests send `Authorization: Bearer <access_token>`. The client refreshes tokens when they are near expiry or when a request receives an authentication failure. If refresh fails, the app returns to the logged-out state.

## Key Selection

After login:

1. Fetch `/keys`.
2. If keys exist, select the first key by default.
3. If no keys exist, show a "No API Key" state and provide a create-key button.
4. Let users switch the selected key in the Key Management page.
5. Only write tool configuration when a selected key exists.

Key management supports listing, creating, refreshing, selecting, copying, and deleting keys, subject to what the gateway API allows.

## Pages And API Mapping

### Login And Register

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `GET /auth/me`

### Dashboard

- `GET /user/profile`
- `GET /usage/dashboard/stats`
- `GET /usage/dashboard/trend`
- `GET /keys`
- `GET /channels/available`

If channel metadata is disabled or unavailable, the model list can fall back to `GET https://sub.thqllm.com/v1/models` with the selected API key.

### Key Management

- `GET /keys`
- `GET /keys/:id`
- `POST /keys`
- `PUT /keys/:id`
- `DELETE /keys/:id`

### Usage Records

- `GET /usage`
- `GET /usage/:id`
- `GET /usage/stats`
- `GET /usage/dashboard/models`
- `GET /usage/dashboard/api-keys-usage`

The page supports date range, model, key, and status filters where the backend supports those parameters.

### Orders

- `GET /payment/orders/my`
- `GET /payment/orders/:id`
- `POST /payment/orders/:id/cancel`
- `POST /payment/orders/verify`

### Recharge

- `GET /payment/config`
- `GET /payment/plans`
- `GET /payment/channels`
- `GET /payment/checkout-info`
- `POST /payment/orders`

The app can create an order natively, then open the external browser for provider-specific payment pages, QR flows, or third-party callbacks.

## Tool Configuration

All local tool configuration uses:

- Base URL: `https://sub.thqllm.com/v1`
- API key: the selected THQ gateway key

The app writes tool config through the existing adapter system where possible:

- Claude and Claude Desktop use Anthropic-compatible or routed config depending on the existing app adapter requirements.
- Codex uses the existing OpenAI/Responses or local routing path, with the THQ model API base.
- Gemini, OpenCode, OpenClaw, and Hermes use their existing project adapters, replacing provider-specific values with the fixed THQ gateway provider.

The UI shows the write status per tool. It never silently ignores missing login, missing key, gateway reachability failure, insufficient balance, or write failure.

## Error Handling

Primary error states:

- Not logged in.
- Token expired and refresh failed.
- No API key exists.
- Selected key was deleted or is invalid.
- Gateway unreachable.
- Management API error.
- Model API error.
- Balance low or insufficient.
- Tool configuration write failed.

Each state should have a visible message and a next action where possible.

## Testing Strategy

Run:

- `pnpm typecheck`
- Focused unit tests for gateway API client behavior.
- Unit tests for token refresh behavior.
- Unit tests for default-first-key selection and no-key empty state.
- Tests for fixed model base URL generation.
- Existing Tauri/service tests that cover provider config writing.

Manual verification:

- Login and logout.
- Dashboard cards load.
- No-key account shows empty state.
- Key selection writes the fixed `https://sub.thqllm.com/v1` base URL.
- Usage records and order pages load.
- Recharge order creation opens the correct external payment flow.

## Open Implementation Notes

- The current app already has provider, proxy, usage, and Tauri command boundaries. The implementation should reuse those boundaries instead of replacing the whole project.
- The new gateway client can live alongside existing API modules, then the primary app route can switch from provider-list-first to gateway-dashboard-first.
- Existing usage dashboard components can be reused visually, but their data source will be the THQ gateway management API rather than only local proxy logs.
