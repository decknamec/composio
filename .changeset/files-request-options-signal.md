---
'@composio/core': patch
---

`composio.files.upload()` and `composio.files.download()` accept the same trailing `ComposioRequestOptions` argument as the other public methods. The `signal` reaches the presigned-URL request and the file transfer, and an aborted call rejects with `ComposioRequestCancelledError`.

```typescript
await composio.files.upload(
  { file: 'path/to/file.pdf', toolSlug: 'google_drive_upload', toolkitSlug: 'google_drive' },
  { signal: AbortSignal.timeout(60_000) }
);
```
