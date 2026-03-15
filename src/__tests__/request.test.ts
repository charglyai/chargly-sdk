import { describe, it, expect, vi, beforeEach } from "vitest";
import { request } from "../request";
import { CharglyError } from "../errors";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("request helper", () => {
  it("sets x-api-key and Content-Type headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ foo: "bar" })),
    });

    await request({
      apiKey: "sk_secret",
      method: "GET",
      path: "/api/test",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.chargly.ai/api/test",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "sk_secret",
        },
      })
    );
  });

  it("uses custom baseUrl when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("{}"),
    });

    await request({
      apiKey: "sk_1",
      baseUrl: "https://custom.example.com",
      method: "GET",
      path: "/api/foo",
    });

    expect(mockFetch).toHaveBeenCalledWith("https://custom.example.com/api/foo", expect.any(Object));
  });

  it("strips trailing slash from baseUrl", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("{}"),
    });

    await request({
      apiKey: "sk_1",
      baseUrl: "https://api.test/",
      method: "GET",
      path: "/api/bar",
    });

    expect(mockFetch).toHaveBeenCalledWith("https://api.test/api/bar", expect.any(Object));
  });

  it("sends POST body as JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: "x" })),
    });

    await request({
      apiKey: "sk_1",
      method: "POST",
      path: "/api/create",
      body: { name: "test", count: 42 },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: '{"name":"test","count":42}',
      })
    );
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: "value" })),
    });

    const result = await request<{ data: string }>({
      apiKey: "sk_1",
      method: "GET",
      path: "/api/data",
    });

    expect(result).toEqual({ data: "value" });
  });

  it("throws CharglyError on non-2xx with API error shape", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: { code: "bad_request", message: "Invalid input" } })
        ),
    });

    await expect(
      request({ apiKey: "sk_1", method: "GET", path: "/api/bad" })
    ).rejects.toMatchObject({
      name: "CharglyError",
      message: "Invalid input",
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("throws CharglyError on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: { code: "unauthorized", message: "Valid API key required" } })
        ),
    });

    await expect(
      request({ apiKey: "invalid", method: "GET", path: "/api/secure" })
    ).rejects.toThrow(CharglyError);
  });

  it("uses status text when error body has no message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(""),
    });

    await expect(
      request({ apiKey: "sk_1", method: "GET", path: "/api/error" })
    ).rejects.toMatchObject({
      message: "Request failed with status 500",
      statusCode: 500,
    });
  });
});
