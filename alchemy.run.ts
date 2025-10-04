/// <reference types="@types/node" />

import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";

const app = await alchemy("csv-analyzer", {
	stateStore: (scope) => new CloudflareStateStore(scope),
});

export const worker = await Vite("app", {
	name: "csv-analyzer",
	entrypoint: "src/worker.ts",
});

console.log({
	url: worker.url,
});

await app.finalize();
