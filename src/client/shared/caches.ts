import { rewriteUrl } from "@rewriters/url";
import { ScramjetClient } from "@client/index";

export default function (client: ScramjetClient, _self: Self) {
	client.Proxy("CacheStorage.prototype.open", {
		apply(ctx) {
			ctx.args[0] = `${client.url.origin}@${ctx.args[0]}`;
		},
	});

	client.Proxy("CacheStorage.prototype.has", {
		apply(ctx) {
			ctx.args[0] = `${client.url.origin}@${ctx.args[0]}`;
		},
	});

	client.Proxy("CacheStorage.prototype.match", {
		apply(ctx) {
			if (typeof ctx.args[0] === "string" || ctx.args[0] instanceof URL) {
				ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);
			}

			const currentOriginPrefix = `${client.url.origin}@`;
			const options = ctx.args[1];

			// Restrict global CacheStorage lookups to cache names scoped to the current proxied origin.
			if (options?.cacheName) {
				options.cacheName = `${currentOriginPrefix}${options.cacheName}`;
				ctx.args[1] = options;

				return;
			}

			ctx.return(
				(async () => {
					const cacheNames = await ctx.this.keys();

					const matchScoped = async (index: number): Promise<Response | undefined> => {
						if (index >= cacheNames.length) return undefined;

						const cacheName = cacheNames[index];
						if (!cacheName.startsWith(currentOriginPrefix)) {
							return matchScoped(index + 1);
						}

						const response = await Reflect.apply(ctx.fn, ctx.this, [
							ctx.args[0],
							{
								...(options ?? {}),
								cacheName,
							},
						]);

						if (response !== undefined) return response;

						return matchScoped(index + 1);
					};

					return matchScoped(0);
				})()
			);
		},
	});

	client.Proxy("CacheStorage.prototype.delete", {
		apply(ctx) {
			ctx.args[0] = `${client.url.origin}@${ctx.args[0]}`;
		},
	});

	client.Proxy("Cache.prototype.add", {
		apply(ctx) {
			if (typeof ctx.args[0] === "string" || ctx.args[0] instanceof URL) {
				ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);
			}
		},
	});

	client.Proxy("Cache.prototype.addAll", {
		apply(ctx) {
			for (let i = 0; i < ctx.args[0].length; i++) {
				if (
					typeof ctx.args[0][i] === "string" ||
					ctx.args[0][i] instanceof URL
				) {
					ctx.args[0][i] = rewriteUrl(ctx.args[0][i], client.meta);
				}
			}
		},
	});

	client.Proxy("Cache.prototype.put", {
		apply(ctx) {
			if (typeof ctx.args[0] === "string" || ctx.args[0] instanceof URL) {
				ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);
			}
		},
	});

	client.Proxy("Cache.prototype.match", {
		apply(ctx) {
			if (typeof ctx.args[0] === "string" || ctx.args[0] instanceof URL) {
				ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);
			}
		},
	});

	client.Proxy("Cache.prototype.matchAll", {
		apply(ctx) {
			if (
				(ctx.args[0] && typeof ctx.args[0] === "string") ||
				(ctx.args[0] && ctx.args[0] instanceof URL)
			) {
				ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);
			}
		},
	});

	client.Proxy("Cache.prototype.keys", {
		apply(ctx) {
			if (
				(ctx.args[0] && typeof ctx.args[0] === "string") ||
				(ctx.args[0] && ctx.args[0] instanceof URL)
			) {
				ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);
			}
		},
	});

	client.Proxy("Cache.prototype.delete", {
		apply(ctx) {
			if (typeof ctx.args[0] === "string" || ctx.args[0] instanceof URL) {
				ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);
			}
		},
	});
}
