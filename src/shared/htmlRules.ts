import { CookieStore } from "@/shared/cookie";
import { rewriteCss } from "@rewriters/css";
import { rewriteHtml, rewriteSrcset } from "@rewriters/html";
import { rewriteUrl, unrewriteBlob, URLMeta } from "@rewriters/url";
import { config } from "@/shared";

export const htmlRules: {
	[key: string]: "*" | string[] | ((...any: any[]) => string | null);
	fn: (value: string, meta: URLMeta, cookieStore: CookieStore) => string | null;
}[] = [
	{
		fn: (value: string, meta: URLMeta) => {
			return rewriteUrl(value, meta);
		},

		// url rewrites
		src: ["embed", "script", "img", "frame", "source", "input", "track"],
		href: ["a", "link", "area", "use", "image"],
		data: ["object"],
		action: ["form"],
		formaction: ["button", "input", "textarea", "submit"],
		poster: ["video"],
		"xlink:href": ["image"],
	},
	{
		fn: (value: string, meta: URLMeta) => {
			const url = rewriteUrl(value, meta);
			const proxyPrefix = location.origin + config.prefix;
			if (!url.startsWith(proxyPrefix)) {
				return url;
			}

			const rewrittenUrl = new URL(url);
			if (meta.topFrameName) {
				rewrittenUrl.searchParams.set("topFrame", meta.topFrameName);
			}
			if (meta.parentFrameName) {
				rewrittenUrl.searchParams.set("parentFrame", meta.parentFrameName);
			}

			return rewrittenUrl.href;
		},
		src: ["iframe"],
	},
	{
		fn: (value: string, meta: URLMeta) => {
			if (value.startsWith("blob:")) {
				// for media elements specifically they must take the original blob
				// because they can't be fetch'd
				return unrewriteBlob(value);
			}

			return rewriteUrl(value, meta);
		},
		src: ["video", "audio"],
	},
	{
		fn: () => "",

		integrity: ["script", "link"],
	},
	{
		fn: () => null,

		// csp stuff that must be deleted
		nonce: "*",
		csp: ["iframe"],
		credentialless: ["iframe"],
	},
	{
		fn: (value: string, meta: URLMeta) => rewriteSrcset(value, meta),

		// srcset
		srcset: ["img", "source"],
		imagesrcset: ["link"],
	},
	{
		fn: (value: string, meta: URLMeta, cookieStore: CookieStore) =>
			rewriteHtml(
				value,
				cookieStore,
				{
					// for srcdoc origin is the origin of the page that the iframe is on. base and path get dropped
					origin: new URL(meta.origin.origin),
					base: new URL(meta.origin.origin),
				},
				true
			),

		// srcdoc
		srcdoc: ["iframe"],
	},
	{
		fn: (value: string, meta: URLMeta) => rewriteCss(value, meta),
		style: "*",
	},
	{
		fn: (value: string, meta: URLMeta) => {
			if (value === "_top" || value === "_unfencedTop")
				return meta.topFrameName || value;
			else if (value === "_parent") return meta.parentFrameName || value;
			else return value;
		},
		target: ["a", "base"],
	},
];
