// thnank you node unblocker guy
import { ParseResultType, parseDomain } from "parse-domain";
import parse from "set-cookie-parser";

export type Cookie = {
	name: string;
	value: string;
	path?: string;
	expires?: string;
	maxAge?: number;
	domain?: string;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: "strict" | "lax" | "none";
	hostOnly?: boolean;
};

function normalizeDomain(domain: string): string {
	return domain.trim().replace(/^\.+/, "").toLowerCase();
}

function canSetDomainForHost(cookieDomain: string, requestHost: string): boolean {
	if (cookieDomain === requestHost) return true;

	return requestHost.endsWith(`.${cookieDomain}`);
}

function isPublicSuffix(domain: string): boolean {
	const parsed = parseDomain(domain);

	return parsed.type === ParseResultType.Listed && !parsed.domain;
}

export class CookieStore {
	private cookies: Record<string, Cookie> = {};

	setCookies(cookies: string[], url: URL) {
		const requestHost = url.hostname.toLowerCase();

		for (const str of cookies) {
			const parsed = parse(str)[0];
			if (!parsed) continue;

			const cookie: Cookie = {
				...parsed,
			};

			if (cookie.domain) {
				const normalizedDomain = normalizeDomain(cookie.domain);
				if (!canSetDomainForHost(normalizedDomain, requestHost)) continue;
				if (isPublicSuffix(normalizedDomain)) continue;
				cookie.domain = normalizedDomain;
				cookie.hostOnly = false;
			} else {
				cookie.domain = requestHost;
				cookie.hostOnly = true;
			}

			if (!cookie.path) cookie.path = "/";
			if (!cookie.sameSite) cookie.sameSite = "lax";
			if (cookie.expires) cookie.expires = cookie.expires.toString();

			const id = `${cookie.domain}@${cookie.path}@${cookie.name}`;
			this.cookies[id] = cookie;
		}
	}

	getCookies(url: URL, fromJs: boolean): string {
		const now = new Date();
		const cookies = Object.values(this.cookies);

		const validCookies: Cookie[] = [];

		for (const cookie of cookies) {
			if (cookie.expires && new Date(cookie.expires) < now) {
				delete this.cookies[`${cookie.domain}@${cookie.path}@${cookie.name}`];
				continue;
			}

			if (cookie.secure && url.protocol !== "https:") continue;
			if (cookie.httpOnly && fromJs) continue;
			if (!url.pathname.startsWith(cookie.path)) continue;

			if (cookie.hostOnly) {
				if (url.hostname.toLowerCase() !== cookie.domain) continue;
			} else if (!canSetDomainForHost(cookie.domain || "", url.hostname.toLowerCase())) {
				continue;
			}

			validCookies.push(cookie);
		}

		return validCookies
			.map((cookie) => `${cookie.name}=${cookie.value}`)
			.join("; ");
	}

	load(cookies: string) {
		if (typeof cookies === "object") return cookies;
		this.cookies = JSON.parse(cookies);
	}

	dump(): string {
		return JSON.stringify(this.cookies);
	}
}
