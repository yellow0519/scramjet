import { ScramjetConfig, ScramjetFlags } from "@/types";

export * from "./cookie";
export * from "./headers";
export * from "./htmlRules";
export * from "./rewriters";
export * from "./security";

export let codecEncode: (input: string) => string;
export let codecDecode: (input: string) => string;

const defaultCodecEncode = (url: string) => {
	if (!url) return url;

	return encodeURIComponent(url);
};
const defaultCodecDecode = (url: string) => {
	if (!url) return url;

	return decodeURIComponent(url);
};

const normalizeCodecSource = (value: string) => value.replace(/\s+/g, "");
export function loadCodecs() {
	const expectedEncodeSources = new Set([
		normalizeCodecSource(defaultCodecEncode.toString()),
		normalizeCodecSource(
			`(url: string) => {
				if (!url) return url;
				return encodeURIComponent(url);
			}`
		),
		normalizeCodecSource(
			`function (url: string) {
				if (!url) return url;
				return encodeURIComponent(url);
			}`
		),
	]);
	const expectedDecodeSources = new Set([
		normalizeCodecSource(defaultCodecDecode.toString()),
		normalizeCodecSource(
			`(url: string) => {
				if (!url) return url;
				return decodeURIComponent(url);
			}`
		),
		normalizeCodecSource(
			`function (url: string) {
				if (!url) return url;
				return decodeURIComponent(url);
			}`
		),
	]);

	const encodeSource = normalizeCodecSource(config.codec.encode);
	const decodeSource = normalizeCodecSource(config.codec.decode);

	if (!expectedEncodeSources.has(encodeSource)) {
		console.warn(
			"[scramjet] Untrusted codec.encode source detected; falling back to default codec."
		);
	}
	if (!expectedDecodeSources.has(decodeSource)) {
		console.warn(
			"[scramjet] Untrusted codec.decode source detected; falling back to default codec."
		);
	}

	codecEncode = defaultCodecEncode;
	codecDecode = defaultCodecDecode;
}

export function flagEnabled(flag: keyof ScramjetFlags, url: URL): boolean {
	const value = config.flags[flag];
	for (const regex in config.siteFlags) {
		const partialflags = config.siteFlags[regex];
		if (new RegExp(regex).test(url.href) && flag in partialflags) {
			return partialflags[flag];
		}
	}

	return value;
}

export let config: ScramjetConfig;
export function setConfig(newConfig: ScramjetConfig) {
	config = newConfig;
	loadCodecs();
}
