import status from "http-status";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import AppError from "../errorHelpers/AppError";

/**
 * SSRF-safe URL assertion + fetch.
 *
 * Guards against Server-Side Request Forgery by rejecting:
 *  - non-http(s) protocols
 *  - literal private/link-local/reserved IPv4 addresses
 *  - hostnames that resolve to private/link-local/reserved IPv4 addresses
 *  - IPv6 literal addresses
 * plus enforcing a timeout, a redirect cap and a response-size cap.
 *
 * NOTE: DNS rebinding is mitigated as far as practical (each redirect hop is
 * re-validated). If the internal network is routable via a public IP this
 * check cannot fully prevent access — rely on network egress rules as well.
 */

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 5;

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 (link-local)
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0xffff0000, 0xffffffff], // 255.255.255.255
];

const ipToInt = (ip: string): number => {
  const [a, b, c, d] = ip.split(".").map(Number);
  return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
};

const isPrivateIpv4 = (ip: string): boolean => {
  const int = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([lo, hi]) => int >= lo && int <= hi);
};

export const assertSafeUrl = async (rawUrl: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError(status.BAD_REQUEST, "Invalid URL provided.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError(
      status.BAD_REQUEST,
      "Only http and https URLs can be fetched.",
    );
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (isIP(hostname)) {
    if (hostname.includes(":")) {
      throw new AppError(
        status.BAD_REQUEST,
        "IPv6 address URLs are not supported.",
      );
    }
    if (isPrivateIpv4(hostname)) {
      throw new AppError(
        status.BAD_REQUEST,
        "This URL points to a private network address.",
      );
    }
    return url;
  }

  const addresses = await lookup(hostname, { all: true });
  for (const { address } of addresses) {
    if (address.includes(":")) {
      throw new AppError(
        status.BAD_REQUEST,
        "This URL resolves to a network address that cannot be fetched.",
      );
    }
    if (isPrivateIpv4(address)) {
      throw new AppError(
        status.BAD_REQUEST,
        "This URL points to a private network address.",
      );
    }
  }

  return url;
};

/**
 * Fetches `rawUrl` following redirects manually, re-validating each hop with
 * `assertSafeUrl`. Returns the final `Response` (headers already checked for
 * the size cap). Callers must read the body with a size guard:
 *   const body = await response.text();
 *   if (body.length > MAX_BYTES) throw ...
 */
export const fetchSafe = async (
  rawUrl: string,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let current = await assertSafeUrl(rawUrl);
    let response: Response | null = null;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SmartNUBBot/1.0; +https://smartnubcampus.com)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new AppError(
            status.BAD_GATEWAY,
            "The URL redirected without a target.",
          );
        }
        current = await assertSafeUrl(
          new URL(location, current).toString(),
        );
        continue;
      }

      break;
    }

    if (!response || response.status >= 400) {
      throw new AppError(
        status.BAD_GATEWAY,
        "Could not fetch the file from the provided URL.",
      );
    }

    const contentLength = Number(
      response.headers.get("content-length") || "0",
    );
    if (contentLength > maxBytes) {
      throw new AppError(
        status.UNPROCESSABLE_ENTITY,
        "The file is too large to process.",
      );
    }

    return response;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(
        status.GATEWAY_TIMEOUT,
        "The file took too long to download.",
      );
    }
    throw new AppError(
      status.BAD_GATEWAY,
      "Could not fetch the file from the provided URL.",
    );
  } finally {
    clearTimeout(timer);
  }
};
