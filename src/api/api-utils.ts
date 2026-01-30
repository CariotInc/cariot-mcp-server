import { AxiosInstance } from 'axios';

export const API_BASE = process.env.CARIOT_API_BASE_URL || 'https://api.cariot.jp/api';

export async function get<T>(client: AxiosInstance, url: string, params?: unknown): Promise<T> {
  const response = await client.get<T>(url, { params });
  return response.data;
}

export async function post<T>(client: AxiosInstance, url: string, data?: unknown): Promise<T> {
  const response = await client.post<T>(url, data);
  return response.data;
}
