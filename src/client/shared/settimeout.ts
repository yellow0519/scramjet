import { rewriteJs } from "@rewriters/js";
import { ScramjetClient } from "@client/index";

export default function (client: ScramjetClient, self: Self) {
	client.Proxy(["setTimeout", "setInterval"], {
		apply(ctx) {
			if (ctx.args.length > 0 && typeof ctx.args[0] !== "function") {
				ctx.args[0] = rewriteJs(
					String(ctx.args[0]),
					"(setTimeout string eval)",
					client.meta
				);
			}
		},
	});
}
