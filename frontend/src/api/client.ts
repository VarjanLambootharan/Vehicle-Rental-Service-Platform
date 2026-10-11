import { encodeText, decodeText } from "./text";
function apiBase(value = import.meta.env.VITE_API_BASE_URL): string {
  const configured = value?.trim();
  if (!configured) return "/api/v1";
  try {
    const url = new URL(configured);
    return (url.pathname === "/" ? `${url.origin}/api/v1` : url.href).replace(
      /\/$/,
      "",
    );
  } catch {
    return `${configured.startsWith("/") ? "" : "/"}${configured}`.replace(
      /\/$/,
      "",
    );
  }
}
export const base = apiBase();
const tokenKey = "traveler.accessToken";
const legacyTokenKey = "vrs.accessToken";
export const session = {
  get: () => {
    const token =
      sessionStorage.getItem(tokenKey) ||
      sessionStorage.getItem(legacyTokenKey);
    if (token) sessionStorage.setItem(tokenKey, token);
    sessionStorage.removeItem(legacyTokenKey);
    return token;
  },
  set: (token: string) => sessionStorage.setItem(tokenKey, token),
  clear: () => {
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(legacyTokenKey);
  },
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const token = session.get();
  let response: Response;
  try {
    response = await fetch(base + path, {
      method,
      headers: {
        Accept: "text/plain",
        ...(body === undefined ? {} : { "Content-Type": "text/plain" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : encodeText(body),
      signal: signal ?? AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    const timedOut =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ApiError(
      0,
      timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
      timedOut
        ? "The rental service did not respond in time. Check that the backend is running, then try again."
        : "Unable to contact the rental service. Check that Spring Boot is running and that the frontend API configuration is correct.",
    );
  }
  if (!response.ok) {
    let data: { code?: string; message?: string } = {};
    try {
      data = decodeText(await response.text());
    } catch {
      /* A proxy may return HTML or an empty error. */
    }
    if (
      response.status === 401 &&
      token &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/register")
    ) {
      session.clear();
      window.dispatchEvent(new Event("traveler:session-expired"));
    }
    throw new ApiError(
      response.status,
      data.code || "REQUEST_FAILED",
      data.message ||
        (response.status >= 500
          ? response.status === 503
            ? "The rental service is unavailable. Confirm Spring Boot is running, then try again."
            : `The rental service returned a server error (${response.status}). Check the backend logs and try again.`
          : `The request could not be completed (${response.status}).`),
    );
  }
  if (response.status === 204) return undefined as T;
  return decodeText<T>(await response.text());
}
export function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
}
