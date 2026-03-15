import { describe, it, expect } from "vitest";
import { CharglyError } from "../errors";

describe("CharglyError", () => {
  it("creates error with message and optional fields", () => {
    const err = new CharglyError("Something failed", {
      statusCode: 404,
      code: "not_found",
      raw: { detail: "User not found" },
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CharglyError);
    expect(err.name).toBe("CharglyError");
    expect(err.message).toBe("Something failed");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("not_found");
    expect(err.raw).toEqual({ detail: "User not found" });
  });

  it("fromResponse extracts message from error object", () => {
    const err = CharglyError.fromResponse(400, {
      error: { code: "bad_request", message: "userId required" },
    });

    expect(err.message).toBe("userId required");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("bad_request");
  });

  it("fromResponse falls back to status when no message", () => {
    const err = CharglyError.fromResponse(500, {});

    expect(err.message).toBe("Request failed with status 500");
    expect(err.statusCode).toBe(500);
  });

  it("fromResponse handles string body", () => {
    const err = CharglyError.fromResponse(502, "Bad Gateway");

    expect(err.message).toBe("Request failed with status 502");
    expect(err.raw).toBe("Bad Gateway");
  });

  it("can be caught and checked with instanceof", () => {
    const err = new CharglyError("Test");
    expect(err instanceof CharglyError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});
