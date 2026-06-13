import { invoke } from "@tauri-apps/api/core";

export interface GatewayTauriRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface GatewayTauriResponse {
  status: number;
  body: unknown;
}

const responseInit = (status: number): ResponseInit => ({
  status,
  headers: { "content-type": "application/json" },
});

const statusDisallowsBody = (status: number): boolean =>
  status === 204 || status === 205 || status === 304;

export const gatewayTauriFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.text();

  const response = await invoke<GatewayTauriResponse>("gateway_http_request", {
    url: request.url,
    method: request.method,
    headers,
    body: body || undefined,
  });

  return new Response(
    statusDisallowsBody(response.status)
      ? null
      : JSON.stringify(response.body ?? null),
    responseInit(response.status),
  );
};
