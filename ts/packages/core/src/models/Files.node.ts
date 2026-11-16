/**
 * @fileoverview Files class for Composio SDK, used to manage files.
 *
 * @author Musthaq Ahamad <musthaq@composio.dev>
 * @date 2025-06-23
 * @module Files
 */
import ComposioClient from '@composio/client';
import { FileDownloadData, FileUploadData } from '../types/files.types';
import { downloadFileFromS3, getFileDataAfterUploadingToS3 } from '../utils/fileUtils.node';
import { telemetry } from '../telemetry/Telemetry';
import { ComposioRequestOptions } from '../types/requestOptions.types';
import { withCancellation } from '../utils/cancellation';

export class Files {
  private readonly fileOptions: {
    sensitiveFileUploadProtection?: boolean;
    fileUploadPathDenySegments?: string[];
    fileDownloadDir?: string;
  };

  constructor(
    private readonly client: ComposioClient,
    fileOptions: {
      sensitiveFileUploadProtection?: boolean;
      fileUploadPathDenySegments?: string[];
      fileDownloadDir?: string;
    } = {}
  ) {
    this.fileOptions = fileOptions;
    telemetry.instrument(this, 'Files');
  }

  /**
   * Upload a file and return the file data.
   *
   * @param params - The upload parameters.
   * @param {File | string} params.file - The path to the file to upload, a URL of the file, or a File object.
   * @param {string} params.toolSlug - The slug of the tool that is uploading the file.
   * @param {string} params.toolkitSlug - The slug of the toolkit that is uploading the file.
   * @param {ComposioRequestOptions} [requestOptions] - Optional `signal` that cancels the upload.
   * @returns {Promise<FileUploadData>} The uploaded file data.
   *
   * @example
   *
   * const fileData = await composio.files.upload({
   *   file: 'path/to/file.pdf',
   *   toolSlug: 'google_drive_upload',
   *   toolkitSlug: 'google_drive'
   * });
   *
   * // Cancel an upload that takes longer than 60 seconds
   * await composio.files.upload(
   *   { file: 'path/to/file.pdf', toolSlug: 'google_drive_upload', toolkitSlug: 'google_drive' },
   *   { signal: AbortSignal.timeout(60_000) }
   * );
   * */
  async upload(
    {
      file,
      toolSlug,
      toolkitSlug,
    }: {
      file: File | string;
      toolSlug: string;
      toolkitSlug: string;
    },
    requestOptions?: ComposioRequestOptions
  ): Promise<FileUploadData> {
    // Note: manual `composio.files.upload()` intentionally skips the
    // `fileUploadDirs` allowlist. The allowlist only gates *automatic* upload
    // during tool execution (see FileToolModifier).
    return withCancellation(
      () =>
        getFileDataAfterUploadingToS3(file, {
          toolSlug,
          toolkitSlug,
          client: this.client,
          sensitiveFileUploadProtection: this.fileOptions.sensitiveFileUploadProtection,
          fileUploadPathDenySegments: this.fileOptions.fileUploadPathDenySegments,
          signal: requestOptions?.signal,
        }),
      requestOptions?.signal
    );
  }

  /**
   * Download a file from S3 and return the file data.
   * @param s3key - The S3 key of the file to download.
   * @param requestOptions - Optional `signal` that cancels the download.
   * @returns The file data.
   */
  async download(
    {
      toolSlug,
      s3Url,
      mimeType,
    }: {
      s3Url: string;
      toolSlug: string;
      mimeType: string;
    },
    requestOptions?: ComposioRequestOptions
  ): Promise<FileDownloadData> {
    return withCancellation(
      () =>
        downloadFileFromS3({
          toolSlug,
          s3Url,
          mimeType,
          fileDownloadDir: this.fileOptions.fileDownloadDir,
          signal: requestOptions?.signal,
        }),
      requestOptions?.signal
    );
  }
}
