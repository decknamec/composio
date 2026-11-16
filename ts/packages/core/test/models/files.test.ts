import { describe, it, expect, vi, beforeEach } from 'vitest';
import ComposioClient, { APIUserAbortError } from '@composio/client';

import { Files } from '../../src/models/Files.node';
import { ComposioRequestCancelledError } from '../../src/errors/SDKErrors';
import { downloadFileFromS3 } from '../../src/utils/fileUtils.node';

// The download helper streams to disk, so it is stubbed; the upload helper runs for real
// against a stubbed client, which proves the signal reaches the first request it makes.
vi.mock('../../src/utils/fileUtils.node', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/utils/fileUtils.node')>();
  return { ...actual, downloadFileFromS3: vi.fn() };
});

describe('Files — request options', () => {
  beforeEach(() => vi.clearAllMocks());

  it('files.upload forwards the signal and reports an abort as ComposioRequestCancelledError', async () => {
    const controller = new AbortController();
    const createPresignedURL = vi.fn(
      (_body: unknown, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new APIUserAbortError()), {
            once: true,
          });
        })
    );
    const files = new Files({ files: { createPresignedURL } } as unknown as ComposioClient);

    const upload = files.upload(
      {
        file: new File(['hello'], 'hello.txt', { type: 'text/plain' }),
        toolSlug: 'TOOL',
        toolkitSlug: 'toolkit',
      },
      { signal: controller.signal }
    );
    await vi.waitFor(() => expect(createPresignedURL).toHaveBeenCalledTimes(1));
    expect(createPresignedURL.mock.calls[0]?.[1]?.signal).toBe(controller.signal);

    controller.abort();
    await expect(upload).rejects.toBeInstanceOf(ComposioRequestCancelledError);
  });

  it('files.download forwards the signal and reports an abort as ComposioRequestCancelledError', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.mocked(downloadFileFromS3).mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );
    const files = new Files({} as unknown as ComposioClient);

    await expect(
      files.download(
        { toolSlug: 'TOOL', s3Url: 'https://s3.example.test/file', mimeType: 'text/plain' },
        { signal: controller.signal }
      )
    ).rejects.toBeInstanceOf(ComposioRequestCancelledError);
    expect(vi.mocked(downloadFileFromS3).mock.calls[0]?.[0]).toMatchObject({
      signal: controller.signal,
    });
  });
});
