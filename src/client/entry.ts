// entrypoint for scramjet.client.js

import { loadCodecs, setConfig } from "@/shared/index";
import { SCRAMJETCLIENT } from "@/symbols";
import { ScramjetClient } from "@client/index";
import { ScramjetContextEvent, UrlChangeEvent } from "@client/events";
import { ScramjetServiceWorkerRuntime } from "@client/swruntime";
import { ScramjetConfig } from "@/types";

const runtimeGlobal = self;

export const iswindow = "window" in runtimeGlobal && window instanceof Window;
export const isworker = "WorkerGlobalScope" in runtimeGlobal;
export const issw = "ServiceWorkerGlobalScope" in runtimeGlobal;
export const isdedicated = "DedicatedWorkerGlobalScope" in runtimeGlobal;
export const isshared = "SharedWorkerGlobalScope" in runtimeGlobal;
export const isemulatedsw =
	"location" in runtimeGlobal &&
	new URL(runtimeGlobal.location.href).searchParams.get("dest") ===
		"serviceworker";

function createFrameId() {
	return `${Array(8)
		.fill(0)
		.map(() => Math.floor(Math.random() * 36).toString(36))
		.join("")}`;
}

export function loadAndHook(config: ScramjetConfig) {
	setConfig(config);
	dbg.log("initializing scramjet client");
	// if it already exists, that means the handlers have probably already been setup by the parent document
	if (!(SCRAMJETCLIENT in <Partial<typeof self>>runtimeGlobal)) {
		loadCodecs();

		const client = new ScramjetClient(runtimeGlobal);
		const frame: HTMLIFrameElement =
			runtimeGlobal.frameElement as HTMLIFrameElement;
		if (frame && !frame.name) {
			// all frames need to be named for our logic to work
			frame.name = createFrameId();
		}

		if (runtimeGlobal.COOKIE) client.loadcookies(runtimeGlobal.COOKIE);

		client.hook();

		if (isemulatedsw) {
			const runtime = new ScramjetServiceWorkerRuntime(client);
			runtime.hook();
		}

		const contextev = new ScramjetContextEvent(client.global.window, client);
		client.frame?.dispatchEvent(contextev);
		const urlchangeev = new UrlChangeEvent(client.url.href);
		if (!client.isSubframe) client.frame?.dispatchEvent(urlchangeev);
	}

	Reflect.deleteProperty(runtimeGlobal, "WASM");
	Reflect.deleteProperty(runtimeGlobal, "COOKIE");
}
