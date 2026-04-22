import { ScramjetFrame } from "@/controller/frame";
import { SCRAMJETCLIENT, SCRAMJETFRAME } from "@/symbols";
import { getOwnPropertyDescriptorHandler } from "@client/helpers";
import { createLocationProxy } from "@client/location";
import { createWrapFn } from "@client/shared/wrap";
import { NavigateEvent } from "@client/events";
import { rewriteUrl, unrewriteUrl, type URLMeta } from "@rewriters/url";
import { config, flagEnabled } from "@/shared";
import { CookieStore } from "@/shared/cookie";
import { iswindow } from "./entry";
import { SingletonBox } from "./singletonbox";
import BareClient from "@mercuryworkshop/bare-mux";

export const SCRAMJETCLIENTINTERNAL = Symbol("scramjet client internal");
//eslint-disable-next-line
export type AnyFunction = Function;

export type ScramjetModule = {
	enabled: (client: ScramjetClient) => boolean | undefined;
	disabled: (
		client: ScramjetClient,
		self: typeof globalThis
	) => void | undefined;
	order: number | undefined;
	default: (client: ScramjetClient, self: typeof globalThis) => void;
};

export type ProxyCtx = {
	fn: AnyFunction;
	this: any;
	args: any[];
	newTarget: AnyFunction;
	return: (r: any) => void;
	call: () => any;
};
export type Proxy = {
	construct?(ctx: ProxyCtx): any;
	apply?(ctx: ProxyCtx): any;
};

export type TrapCtx<T> = {
	this: any;
	get: () => T;
	set: (v: T) => void;
};
export type Trap<T> = {
	writable?: boolean;
	value?: any;
	enumerable?: boolean;
	configurable?: boolean;
	get?: (ctx: TrapCtx<T>) => T;
	set?: (ctx: TrapCtx<T>, v: T) => void;
};

export class ScramjetClient {
	locationProxy: any;
	serviceWorker: ServiceWorkerContainer;
	// epoxy: EpoxyClient;
	bare: BareClient;

	private nativeStore: Record<string, any> = {};
	private descriptorStore: Record<string, PropertyDescriptor> = {};
	wrapfn: (i: any, ...args: any) => any;

	cookieStore = new CookieStore();

	eventcallbacks: Map<
		any,
		[
			{
				event: string;
				originalCallback: AnyFunction;
				proxiedCallback: AnyFunction;
			},
		]
	> = new Map();

	meta: URLMeta;

	box: SingletonBox;

	constructor(public global: typeof globalThis) {
		if (SCRAMJETCLIENT in global) {
			console.error(
				"attempted to initialize a scramjet client, but one is already loaded - this is very bad"
			);
			throw new Error();
		}

		if (iswindow) {
			dbg.warn("Creating SingletonBox");
			this.box = new SingletonBox(this);
		} else {
			this.box = new SingletonBox(this);
		}

		this.box.registerClient(this, global as Self);

		/*
		initEpoxy().then(() => {
			let options = new EpoxyClientOptions();
			options.user_agent = navigator.userAgent;
			this.epoxy = new EpoxyClient(config.wisp, options);
		});
		*/

		if (iswindow) {
			// this.bare = new EpoxyClient();
			this.bare = new BareClient();
		} else {
			this.bare = new BareClient(
				new Promise((resolve) => {
					addEventListener("message", ({ data }) => {
						if (typeof data !== "object") return;
						if (
							"$scramjet$type" in data &&
							data.$scramjet$type === "baremuxinit"
						) {
							resolve(data.port);
						}
					});
				})
			);
		}

		this.serviceWorker = this.global.navigator.serviceWorker;

		if (iswindow) {
			global.document[SCRAMJETCLIENT] = this;
		}

		this.wrapfn = createWrapFn(this, global);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const client = this;
		this.meta = {
			get origin() {
				return client.url;
			},
			get base() {
				if (iswindow) {
					const base = client.callNative(
						SCRAMJETCLIENTINTERNAL,
						"Document.prototype.querySelector",
						client.global.document,
						"base"
					);
					if (base) {
						let url = base.getAttribute("href");
						if (!url) return client.url;
						const frag = url.indexOf("#");
						url = url.substring(0, frag === -1 ? undefined : frag);
						if (!url) return client.url;

						return new URL(url, client.url.origin);
					}
				}

				return client.url;
			},
			get topFrameName() {
				if (!iswindow)
					throw new Error("topFrameName was called from a worker?");

				let currentWin = client.global;
				if (currentWin.parent.window == currentWin.window) {
					// we're top level & we don't have a frame name
					return null;
				}

				// find the topmost frame that's controlled by scramjet, stopping before the real top frame
				while (currentWin.parent.window !== currentWin.window) {
					if (!currentWin.parent.window[SCRAMJETCLIENT]) break;
					currentWin = currentWin.parent.window;
				}

				const curclient = currentWin[SCRAMJETCLIENT];
				const frame = curclient.getDescriptorValue(
					SCRAMJETCLIENTINTERNAL,
					"window.frameElement",
					currentWin
				);
				if (!frame) {
					// we're inside an iframe, but the top frame is scramjet-controlled and top level, so we can't get a top frame name
					return null;
				}
				if (!frame.name) {
					// the top frame is scramjet-controlled, but it has no name. this is user error
					console.error(
						"YOU NEED TO USE `new ScramjetFrame()`! DIRECT IFRAMES WILL NOT WORK"
					);

					return null;
				}

				return frame.name;
			},
			get parentFrameName() {
				if (!iswindow)
					throw new Error("parentFrameName was called from a worker?");
				if (client.global.parent.window == client.global.window) {
					// we're top level & we don't have a frame name
					return null;
				}

				let parentWin = client.global.parent.window;
				if (parentWin[SCRAMJETCLIENT]) {
					// we're inside an iframe, and the parent is scramjet-controlled
					const parentClient = parentWin[SCRAMJETCLIENT];
					const frame = parentClient.getDescriptorValue(
						SCRAMJETCLIENTINTERNAL,
						"window.frameElement",
						parentWin
					);

					if (!frame) {
						// parent is scramjet controlled and top-level. there is no parent frame name
						return null;
					}

					if (!frame.name) {
						// the parent frame is scramjet-controlled, but it has no name. this is user error
						console.error(
							"YOU NEED TO USE `new ScramjetFrame()`! DIRECT IFRAMES WILL NOT WORK"
						);

						return null;
					}

					return frame.name;
				} else {
					// we're inside an iframe, and the parent is not scramjet-controlled
					// return our own frame name
					const frame = client.getDescriptorValue(
						SCRAMJETCLIENTINTERNAL,
						"window.frameElement",
						client.global
					);
					if (!frame.name) {
						// the parent frame is not scramjet-controlled, so we can't get a parent frame name
						console.error(
							"YOU NEED TO USE `new ScramjetFrame()`! DIRECT IFRAMES WILL NOT WORK"
						);

						return null;
					}

					return frame.name;
				}
			},
		};
		this.locationProxy = createLocationProxy(this, global);

		global[SCRAMJETCLIENT] = this;
	}

	private assertInternal(internal: symbol) {
		if (internal !== SCRAMJETCLIENTINTERNAL) {
			throw new TypeError("Access denied");
		}
	}
	private getNative(target: string) {
		if (!(target in this.nativeStore)) {
			const split = target.split(".");
			const prop = split.pop();
			const realTarget = split.reduce((a, b) => a?.[b], this.global);
			if (!realTarget) return;

			this.nativeStore[target] = Reflect.get(realTarget, prop);
		}

		return this.nativeStore[target];
	}
	private getDescriptor(target: string) {
		if (!(target in this.descriptorStore)) {
			const split = target.split(".");
			const prop = split.pop();
			const realTarget = split.reduce((a, b) => a?.[b], this.global);
			if (!realTarget) return;

			this.descriptorStore[target] = this.callNative(
				SCRAMJETCLIENTINTERNAL,
				"Object.getOwnPropertyDescriptor",
				null,
				realTarget,
				prop
			);
		}

		return this.descriptorStore[target];
	}
	callNative(internal: symbol, target: string, that: any, ...args: any[]) {
		this.assertInternal(internal);
		const original = this.getNative(target);
		if (!original) return null;

		return original.call(that, ...args);
	}
	constructNative(internal: symbol, target: string, ...args: any[]) {
		this.assertInternal(internal);
		const original = this.getNative(target);
		if (!original) return null;

		return new original(...args);
	}
	nativeValue(internal: symbol, target: string) {
		this.assertInternal(internal);

		return this.getNative(target);
	}
	getDescriptorValue(internal: symbol, target: string, that: any) {
		this.assertInternal(internal);
		const original = this.getDescriptor(target);
		if (!original) return null;

		return original.get.call(that);
	}
	setDescriptorValue(internal: symbol, target: string, that: any, value: any) {
		this.assertInternal(internal);
		const original = this.getDescriptor(target);
		if (!original) return null;

		original.set.call(that, value);
	}

	get frame(): ScramjetFrame | null {
		if (!iswindow) return null;
		const frame = this.getDescriptorValue(
			SCRAMJETCLIENTINTERNAL,
			"window.frameElement",
			this.global
		);

		if (!frame) return null; // we're top level
		const sframe = frame[SCRAMJETFRAME];

		if (!sframe) {
			// we're in a subframe, recurse upward until we find one
			let currentwin = this.global.window;
			while (currentwin.parent !== currentwin) {
				let currentclient = currentwin[SCRAMJETCLIENT];
				let currentFrame = currentclient.getDescriptorValue(
					SCRAMJETCLIENTINTERNAL,
					"window.frameElement",
					currentwin
				);
				if (!currentFrame) return null; // ??
				if (currentFrame && currentFrame[SCRAMJETFRAME]) {
					return currentFrame[SCRAMJETFRAME];
				}
				currentwin = currentwin.parent.window;
			}
		}

		return sframe;
	}
	get isSubframe(): boolean {
		if (!iswindow) return false;
		const frame = this.getDescriptorValue(
			SCRAMJETCLIENTINTERNAL,
			"window.frameElement",
			this.global
		);

		if (!frame) return false; // we're top level
		const sframe = frame[SCRAMJETFRAME];
		if (!sframe) return true;

		return false;
	}
	loadcookies(cookiestr: string) {
		this.cookieStore.load(cookiestr);
	}

	hook() {
		const context = import.meta.webpackContext(".", {
			recursive: true,
		});

		const modules: ScramjetModule[] = [];

		for (const key of context.keys()) {
			const module = context(key) as ScramjetModule;
			if (!key.endsWith(".ts")) continue;
			if (
				(key.startsWith("./dom/") && "window" in this.global) ||
				(key.startsWith("./worker/") && "WorkerGlobalScope" in this.global) ||
				key.startsWith("./shared/")
			) {
				modules.push(module);
			}
		}

		modules.sort((a, b) => {
			const aorder = a.order || 0;
			const border = b.order || 0;

			return aorder - border;
		});

		for (const module of modules) {
			if (!module.enabled || module.enabled(this))
				module.default(this, this.global);
			else if (module.disabled) module.disabled(this, this.global);
		}
	}

	get url(): URL {
		return new URL(unrewriteUrl(this.global.location.href));
	}

	set url(url: URL | string) {
		if (url instanceof URL) url = url.toString();

		const ev = new NavigateEvent(url);
		if (this.frame) {
			this.frame.dispatchEvent(ev);
		}
		if (ev.defaultPrevented) return;

		this.global.location.href = rewriteUrl(ev.url, this.meta);
	}

	// below are the utilities for proxying and trapping dom APIs
	// you don't have to understand this it just makes the rest easier
	// i'll document it eventually

	Proxy(name: string | string[], handler: Proxy) {
		if (Array.isArray(name)) {
			for (const n of name) {
				this.Proxy(n, handler);
			}

			return;
		}

		const split = name.split(".");
		const prop = split.pop();
		const target = split.reduce((a, b) => a?.[b], this.global);
		if (!target) return;

		if (!(name in this.nativeStore)) {
			const original = Reflect.get(target, prop);
			this.nativeStore[name] = original;
		}

		this.RawProxy(target, prop, handler);
	}
	RawProxy(target: any, prop: string, handler: Proxy) {
		if (!target) return;
		if (!prop) return;
		if (!Reflect.has(target, prop)) return;

		const value = Reflect.get(target, prop);
		delete target[prop];

		const h: ProxyHandler<any> = {};

		if (handler.construct) {
			h.construct = function (
				constructor: any,
				args: any[],
				newTarget: AnyFunction
			) {
				let returnValue: any = undefined;
				let earlyreturn = false;

				const ctx: ProxyCtx = {
					fn: constructor,
					this: null,
					args,
					newTarget: newTarget,
					return: (r: any) => {
						earlyreturn = true;
						returnValue = r;
					},
					call: () => {
						earlyreturn = true;
						returnValue = Reflect.construct(ctx.fn, ctx.args, ctx.newTarget);

						return returnValue;
					},
				};

				handler.construct(ctx);

				if (earlyreturn) {
					return returnValue;
				}

				return Reflect.construct(ctx.fn, ctx.args, ctx.newTarget);
			};
		}

		if (handler.apply) {
			h.apply = (fn: any, that: any, args: any[]) => {
				let returnValue: any = undefined;
				let earlyreturn = false;

				const ctx: ProxyCtx = {
					fn,
					this: that,
					args,
					newTarget: null,
					return: (r: any) => {
						earlyreturn = true;
						returnValue = r;
					},
					call: () => {
						earlyreturn = true;
						returnValue = Reflect.apply(ctx.fn, ctx.this, ctx.args);

						return returnValue;
					},
				};

				const pst = Error.prepareStackTrace;

				Error.prepareStackTrace = function (err, s) {
					if (
						s[0].getFileName() &&
						!s[0].getFileName().startsWith(location.origin + config.prefix)
					) {
						return { stack: err.stack };
					}
				};

				try {
					handler.apply(ctx);
				} catch (err) {
					if (err instanceof Error) {
						if ((err.stack as any) instanceof Object) {
							//@ts-expect-error i'm not going to explain this
							err.stack = err.stack.stack;
							console.error("ERROR FROM SCRAMJET INTERNALS", err);
							if (!flagEnabled("allowFailedIntercepts", this.url)) {
								throw err;
							}
						} else {
							throw err;
						}
					} else {
						throw err;
					}
				}

				Error.prepareStackTrace = pst;

				if (earlyreturn) {
					return returnValue;
				}

				return Reflect.apply(ctx.fn, ctx.this, ctx.args);
			};
		}

		h.getOwnPropertyDescriptor = getOwnPropertyDescriptorHandler;
		target[prop] = new Proxy(value, h);
	}
	Trap<T>(name: string | string[], descriptor: Trap<T>): PropertyDescriptor {
		if (Array.isArray(name)) {
			for (const n of name) {
				this.Trap(n, descriptor);
			}

			return;
		}

		const split = name.split(".");
		const prop = split.pop();
		const target = split.reduce((a, b) => a?.[b], this.global);
		if (!target) return;

		const original = this.callNative(
			SCRAMJETCLIENTINTERNAL,
			"Object.getOwnPropertyDescriptor",
			null,
			target,
			prop
		);
		this.descriptorStore[name] = original;

		return this.RawTrap(target, prop, descriptor);
	}
	RawTrap<T>(
		target: any,
		prop: string,
		descriptor: Trap<T>
	): PropertyDescriptor {
		if (!target) return;
		if (!prop) return;
		if (!Reflect.has(target, prop)) return;

		const oldDescriptor = this.callNative(
			SCRAMJETCLIENTINTERNAL,
			"Object.getOwnPropertyDescriptor",
			null,
			target,
			prop
		);

		const ctx: TrapCtx<T> = {
			this: null,
			get: function () {
				return oldDescriptor && oldDescriptor.get.call(this.this);
			},
			set: function (v: T) {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				oldDescriptor && oldDescriptor.set.call(this.this, v);
			},
		};

		delete target[prop];

		const desc: PropertyDescriptor = {};

		if (descriptor.get) {
			desc.get = function () {
				ctx.this = this;

				return descriptor.get(ctx);
			};
		} else if (oldDescriptor?.get) {
			desc.get = oldDescriptor.get;
		}

		if (descriptor.set) {
			desc.set = function (v: T) {
				ctx.this = this;

				descriptor.set(ctx, v);
			};
		} else if (oldDescriptor?.set) {
			desc.set = oldDescriptor.set;
		}

		if (descriptor.enumerable) desc.enumerable = descriptor.enumerable;
		else if (oldDescriptor?.enumerable)
			desc.enumerable = oldDescriptor.enumerable;
		if (descriptor.configurable) desc.configurable = descriptor.configurable;
		else if (oldDescriptor?.configurable)
			desc.configurable = oldDescriptor.configurable;

		Object.defineProperty(target, prop, desc);

		return oldDescriptor;
	}
}
