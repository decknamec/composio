---
'@composio/core': patch
---

`composio.connectedAccounts.update()` accepts `alias` and `connection` again, as the docs show, next to `enabled`. `alias` and `connection` go to `PATCH /api/v3.1/connected_accounts/{nanoid}`, the same endpoint the Python SDK's `connected_accounts.update()` uses; `enabled` keeps using the status endpoint. With both kinds of field, the PATCH runs first and the status call second. A call without any field rejects with `ValidationError`.

```typescript
await composio.connectedAccounts.update('ca_abc123', { alias: 'work-gmail' });

await composio.connectedAccounts.update('ca_abc123', {
  connection: { state: { authScheme: 'BEARER_TOKEN', val: { token: 'new-access-token' } } },
});
```
