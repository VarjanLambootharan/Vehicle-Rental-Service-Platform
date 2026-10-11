import { encodeText, decodeText } from "./text";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, base, query, request, session } from "./client";
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());
describe("API transport contract", () => {
  it("sends only provided text fields and the stored bearer token", async () => {
    session.set("test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(encodeText({ id: "b" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await request("/bookings", "POST", {
      vehicleId: "v",
      pickupDate: "2030-01-01",
      returnDate: "2030-01-02",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer test-token");
    expect(decodeText(options.body)).not.toHaveProperty("totalAmount");
    expect(decodeText(options.body)).not.toHaveProperty("customerId");
  });
  it("preserves durable 202 cancellation state and handles bodyless 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(encodeText({ status: "CANCELLATION_PENDING" }), {
            status: 202,
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    );
    expect(await request("/bookings/b", "DELETE")).toEqual({
      status: "CANCELLATION_PENDING",
    });
    expect(await request("/reviews/r", "DELETE")).toBeUndefined();
  });
  it("retains conflict code and server validation message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            encodeText({
              code: "BOOKING_HAS_PAYMENT",
              message: "Pending or paid bookings cannot be modified",
            }),
            { status: 409 },
          ),
        ),
    );
    await expect(request("/bookings/b", "PUT", {})).rejects.toMatchObject({
      status: 409,
      code: "BOOKING_HAS_PAYMENT",
      message: "Pending or paid bookings cannot be modified",
    });
  });
  it("expires authenticated sessions but does not expire them on failed login", async () => {
    session.set("test-token");
    const listener = vi.fn();
    window.addEventListener("traveler:session-expired", listener);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response(encodeText({}), { status: 401 })),
        ),
    );
    await expect(request("/auth/login", "POST", {})).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(session.get()).toBe("test-token");
    expect(listener).not.toHaveBeenCalled();
    await expect(request("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(session.get()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
  });
  it("does not retry an ambiguous failed mutation", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError("Network unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(request("/payments", "POST", {})).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("uses the proxied API base and distinguishes a timeout from a response", async () => {
    expect(base).toBe("/api/v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")),
    );
    await expect(request("/auth/login", "POST", {})).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
      message: expect.stringContaining("did not respond in time"),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Gateway error", { status: 502 })),
    );
    await expect(request("/auth/login", "POST", {})).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("server error"),
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(encodeText({ code: "API_UNAVAILABLE" }), {
            status: 503,
          }),
        ),
    );
    await expect(request("/vehicles")).rejects.toMatchObject({
      status: 503,
      code: "API_UNAVAILABLE",
      message: expect.stringContaining("Confirm Spring Boot is running"),
    });
  });
  it("encodes supported search values and omits absent values", () => {
    expect(
      query({
        q: "A & B",
        type: "",
        minimumPassengers: 0,
        pickupDate: undefined,
      }),
    ).toBe("?q=A+%26+B&minimumPassengers=0");
  });
});
