/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	BASECAMP_ACCESS_TOKEN: string;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		let formJson = { "Title": "", "Description": "", "Date due": "" };
		formJson = await request.json();
		let baseCampData = {
			"content": formJson["Title"],
			"description": formJson["Description"],
			"due_on": formJson["Date due"]
		};
		console.log("Sending the following data on to basecamp")
		console.log(JSON.stringify(baseCampData))
		const response = await fetch(
			"https://3.basecampapi.com/5395843/buckets/28388324/todolists/5749130391/todos.json", {
			method: 'POST',
			headers: new Headers({
				"Authorization": "Bearer " + env.BASECAMP_ACCESS_TOKEN,
				"Content-Type": "application/json",
				"Accept": "*/*",
				"User-Agent": "Forms to basecamp adapter (alexandertaylor@cedarville.edu)"
			}), 
			body: JSON.stringify(baseCampData)
		})
		console.log("Received response " + response.status)
		return new Response("200/OK");
	},
};
