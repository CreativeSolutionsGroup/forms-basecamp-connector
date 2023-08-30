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
  basecamp: KVNamespace;

  CLIENT_ID: string;
  CLIENT_SECRET: string;
  REDIRECT_URI: string;
}

// A data type describing the data that we expect to receive on this endpoint
type RequestData = {
  title: string;
  content: string;
  due_on: string;
  type: string;
  projectId: string;
  subId: string;
  assignee_ids?: Array<number>;
};

// The type of data that the card creation endpoint expects
type BasecampCardData = {
  title: string;
  content: string;
  due_on: string;
  assignee_ids?: Array<number>;
};

// The type of data that the todo creation endpoint 
type BasecampListData = {
  // Equivalent to title on card data
  content: string;
  // Equivalent to content on list data
  description: string;
  due_on: string;
  assignee_ids?: Array<number>;
};

// Convert the card data to the list data
// This way we can have only one format for the data coming in to the connector
const toListData = (data: BasecampCardData) => {
  return {
    content: data.title,
    description: data.content,
    due_on: data.due_on,
    assignee_ids: data.assignee_ids,
  } as BasecampListData;
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Scope to make sure we don't have variable leaking
    {
      // Get the token from the KV store
      const bearer = await env.basecamp.get("bearer");
      // Check to see if the token is still valid
      const authRequest = await fetch(
        "https://launchpad.37signals.com/authorization.json",
        {
          method: "GET",
          headers: new Headers({
            Authorization: "Bearer " + bearer,
          }),
        }
      );
      // We are not authorized
      if (authRequest.status === 401) {
        // Get the refresh token from the KV store
        // The refresh token never expires and will be used somewhere around once a week
        const refresh = await env.basecamp.get("refresh");
        // Fetch the endpoint to get a new token
        const refreshResponse = await fetch(
          `https://launchpad.37signals.com/authorization/token?type=refresh&refresh_token=${refresh}&client_id=${env.CLIENT_ID}&redirect_uri=${env.REDIRECT_URI}&client_secret=${env.CLIENT_SECRET}`,
          {
            method: "POST",
          }
        );
        // We have our new token now
        const newToken = (await refreshResponse.json()) as {
          access_token: string;
          expires_in: number;
        };
        console.log(newToken);
        // Put the new bearer token to the KV store
        await env.basecamp.put("bearer", newToken.access_token);
      }
    }

    // We need to make sure that we have the newest bearer token
    const bearer = await env.basecamp.get("bearer");
    // Get the data from the request made to the worker
    const formJson: RequestData = await request.json();
    console.log("Received this data from google forms:");
    console.log(formJson);

    // Calculate a week from now
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    // If we don't have any information about the due date set it to a week from now
    if (!formJson.due_on || formJson.due_on.length === 0) {
      // Only take the data that we need
      formJson.due_on = nextWeek.toISOString().slice(0, 10);
    }

    // Switch based on whether we are pushing to a card table or todo list
    const basecampURL =
      `https://3.basecampapi.com/5395843/buckets/${formJson.projectId}/` +
      (formJson.type === "list"
        ? `todolists/${formJson.subId}/todos.json`
        : `card_tables/lists/${formJson.subId}/cards.json`);

    // Fetch the API endpoint to create a new todo or card
    const response = await fetch(basecampURL, {
      method: "POST",
      headers: new Headers({
        Authorization: "Bearer " + bearer,
        "Content-Type": "application/json",
        Accept: "*/*",
        // User agent is required by basecamp (not sure how strictly this is enforced)
        "User-Agent":
          "Forms to basecamp adapter (alexandertaylor@cedarville.edu)",
      }),
      // Convert the data to the different formats
      // (list format makes no sense, but that's another story)
      body: JSON.stringify(
        formJson.type === "list"
          ? toListData(formJson)
          : (formJson as BasecampCardData)
      ),
    });
    // Log the response we get back
    console.log("Received response " + response.status);

    return new Response("200/OK");
  },
};
