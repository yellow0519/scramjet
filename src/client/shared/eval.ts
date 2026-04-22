import { config } from "@/shared";
import { rewriteJs } from "@rewriters/js";
import { ScramjetClient } from "@client/index";

export default function (client: ScramjetClient, self: Self) {
	// used for proxying *direct eval*
	// eval("...") -> eval($scramjet$rewrite("..."))
	Object.defineProperty(self, config.globals.rewritefn, {
		value: function (js: any) {
			if (typeof js !== "string") return js;

			const rewritten = rewriteJs(js, "(direct eval proxy)", client.meta);

			return rewritten;
		},
		writable: false,
		configurable: false,
	});
}

export function indirectEval(this: ScramjetClient, strict: boolean, js: any) {
	// > If the argument of eval() is not a string, eval() returns the argument unchanged
	if (typeof js !== "string") return js;

	const rewritten = rewriteJs(js, "(indirect eval proxy)", this.meta) as string;

	let indirection: (code: string) => any;
	if (strict) {
		console.log("USING STRICT EVAL - BOTGUARD");
		indirection = new Function("code", `
			"use strict";
			return eval(code);
		`) as (code: string) => any;
	} else {
		indirection = this.global.eval as (code: string) => any;
	}

	return indirection(rewritten);
}
