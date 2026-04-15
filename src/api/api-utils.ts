import { FetchClient, FetchRequestConfig } from '../lib/http-client.js';

export const API_BASE = process.env.CARIOT_API_BASE_URL || 'https://api.dev.cariot.jp/api';

export async function get<T>(client: FetchClient, url: string, params?: unknown): Promise<T> {
  const config: FetchRequestConfig = params ? { params: params as Record<string, unknown> } : {};
  const response = await client.get<T>(url, config);
  return response.data;
}

export async function post<T>(client: FetchClient, url: string, data?: unknown): Promise<T> {
  const response = await client.post<T>(url, data);
  return response.data;
}
