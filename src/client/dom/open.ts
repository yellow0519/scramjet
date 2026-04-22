import { ScramjetClient } from "@client/index";
import { SCRAMJETCLIENT } from "@/symbols";
import { rewriteUrl } from "@rewriters/url";

type ScramjetWindow = Window &
	typeof globalThis & {
		[SCRAMJETCLIENT]?: ScramjetClient;
	};

export default function (client: ScramjetClient) {
	client.Proxy("window.open", {
		apply(ctx) {
			if (ctx.args[0]) ctx.args[0] = rewriteUrl(ctx.args[0], client.meta);

			if (ctx.args[1] === "_top" || ctx.args[1] === "_unfencedTop")
				ctx.args[1] = client.meta.topFrameName || ctx.args[1];
			if (ctx.args[1] === "_parent")
				ctx.args[1] = client.meta.parentFrameName || ctx.args[1];

			const realwin = ctx.call();

			if (!realwin) return ctx.return(realwin);

			if (SCRAMJETCLIENT in realwin) {
				return ctx.return(realwin[SCRAMJETCLIENT].global);
			} else {
				const newclient = new ScramjetClient(realwin);
				// hook the opened window
				newclient.hook();

				return ctx.return(newclient.global);
			}
		},
	});

	document.addEventListener(
		"click",
		(event) => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			const path = event.composedPath();
			const anchor = path.find(
				(node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement
			);
			if (!anchor) return;

			const target = anchor.getAttribute("target");
			if (!target) return;
			if (!["_top", "_unfencedTop", "_parent"].includes(target)) return;

			const href = anchor.href;
			if (!href) return;

			let targetWindow = client.global as ScramjetWindow;
			if (target === "_parent") {
				const parentWindow = client.global.parent as ScramjetWindow;
				if (SCRAMJETCLIENT in parentWindow) {
					targetWindow = parentWindow;
				}
			} else {
				while (
					targetWindow.parent !== targetWindow &&
					SCRAMJETCLIENT in (targetWindow.parent as ScramjetWindow)
				) {
					targetWindow = targetWindow.parent as ScramjetWindow;
				}
			}

			const targetClient: ScramjetClient = targetWindow[SCRAMJETCLIENT] || client;

			event.preventDefault();
			targetClient.url = href;
		},
		true
	);

	client.Trap("window.frameElement", {
		get(ctx) {
			const f = ctx.get() as HTMLIFrameElement | null;
			if (!f) return f;

			const win = f.ownerDocument.defaultView;
			if (win[SCRAMJETCLIENT]) {
				// then this is a subframe in a scramjet context, and it's safe to pass back the real iframe
				return f;
			} else {
				// no, the top frame is outside the sandbox
				return null;
			}
		},
	});
}
