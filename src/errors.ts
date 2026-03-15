import type { CharglyApiError } from "./types";

export class CharglyError extends Error {
  readonly statusCode?: number;
  readonly code?: string;
  readonly raw?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      raw?: unknown;
    }
  ) {
    super(message);
    this.name = "CharglyError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.raw = options?.raw;
    Object.setPrototypeOf(this, CharglyError.prototype);
  }

  static fromResponse(statusCode: number, body: CharglyApiError | string): CharglyError {
    const message =
      typeof body === "object" && body?.error?.message
        ? body.error.message
        : typeof body === "object" && typeof body?.message === "string"
          ? body.message
          : `Request failed with status ${statusCode}`;

    const code =
      typeof body === "object" && body?.error?.code ? body.error.code : undefined;

    return new CharglyError(message, {
      statusCode,
      code,
      raw: body,
    });
  }
}
