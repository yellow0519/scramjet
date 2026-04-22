import { iswindow } from "@client/entry";
import { SCRAMJETCLIENT } from "@/symbols";
import { ScramjetClient } from "@client/index";
import { POLLUTANT } from "@client/shared/realm";

export default function (client: ScramjetClient) {
	if (iswindow)
		client.Proxy("window.postMessage", {
			apply(ctx) {
				// so we need to send the real origin here, since the recieving window can't possibly know.
				// except, remember that this code is being ran in a different realm than the invoker, so if we ask our `client` it may give us the wrong origin
				// if we were given any object that came from the real realm we can use that to get the real origin
				// and this works in every case EXCEPT for the fact that all three arguments can be strings which are copied instead of cloned
				// so we have to use `$setrealm` which will pollute this with an object from the real realm

				let callerClient = client;
				let wrappedPostMessage = ctx.fn;

				// Only use realm data from the object explicitly installed by $setrealm.
				// Message payload/transfer objects are attacker controlled and cannot be trusted.
				if (
					ctx.this &&
					POLLUTANT in ctx.this &&
					typeof ctx.this[POLLUTANT] === "object" &&
					ctx.this[POLLUTANT] !== null
				) {
					const {
						constructor: { constructor: Function },
					} = ctx.this[POLLUTANT];

					// invoking stolen function will give us the caller's globalThis, remember scramjet has already proxied it!!!
					const callerGlobalThisProxied: Self = Function("return globalThis")();
					callerClient =
						callerGlobalThisProxied[SCRAMJETCLIENT] || callerClient;

					// this WOULD be enough but the source argument of MessageEvent has to return the caller's window
					// and if we just call it normally it would be coming from here, which WILL NOT BE THE CALLER'S because the accessor is from the parent
					// so with the stolen function we wrap postmessage so the source will truly be the caller's window (remember that function is scramjet's!!!)
					wrappedPostMessage = Function("...args", "this(...args)");
				}

				ctx.args[0] = {
					$scramjet$messagetype: "window",
					$scramjet$origin: callerClient.url.origin,
					$scramjet$data: ctx.args[0],
				};

				// * origin because obviously
				if (typeof ctx.args[1] === "string") ctx.args[1] = "*";
				if (typeof ctx.args[1] === "object") ctx.args[1].targetOrigin = "*";

				ctx.return(wrappedPostMessage.call(ctx.fn, ...ctx.args));
			},
		});

	const toproxy = ["MessagePort.prototype.postMessage"];

	if (self.Worker) toproxy.push("Worker.prototype.postMessage");
	if (!iswindow) toproxy.push("self.postMessage"); // only do the generic version if we're in a worker

	client.Proxy(toproxy, {
		apply(ctx) {
			// origin/source doesn't need to be preserved - it's null in the message event

			ctx.args[0] = {
				$scramjet$messagetype: "worker",
				$scramjet$data: ctx.args[0],
			};
		},
	});
}
