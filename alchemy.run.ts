/// <reference types="@types/node" />

import alchemy from "alchemy";
import { CustomDomain, Vite } from "alchemy/cloudflare";
import { GitHubComment } from "alchemy/github";
import { CloudflareStateStore } from "alchemy/state";

const app = await alchemy("csv-analyzer", {
	stateStore: (scope) => new CloudflareStateStore(scope),
});

export const worker = await Vite("app", {
	name: `${app.name}${app.stage === "nbbaier" || app.stage === "prod" ? "" : `-${app.stage}`}`,
	entrypoint: "src/worker.ts",
});

if (app.stage === "prod") {
	const domain = await CustomDomain("csv-analyzer", {
		name: `csv.nicobaier.com`,
		zoneId: "519111dc05a4ec34cb1fb3f87f485c6a",
		workerName: worker.name,
	});
	console.log("Custom domain created");
	console.log({ domainUrl: domain.name });
}

console.log({ url: worker.url });

if (process.env.PULL_REQUEST) {
	// if this is a PR, add a comment to the PR with the preview URL
	await GitHubComment("preview-comment", {
		owner: "nbbaier",
		repository: "cf-pglite-csv",
		issueNumber: Number(process.env.PULL_REQUEST),
		body: `
      ## 🚀 Preview Deployed

      Your changes have been deployed to a preview environment:

      **🌐 Website:** [${worker.url}](${worker.url})

      Built from commit ${process.env.GITHUB_SHA?.slice(0, 7)}

      ---
      <sub>🤖 This comment updates automatically with each push.</sub>`,
	});
}

await app.finalize();
