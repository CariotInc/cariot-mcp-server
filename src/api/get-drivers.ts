import { AxiosInstance } from 'axios';
import { API_BASE, get } from './api-utils.js';
import { DriversQuery, GetDriversListResponse } from './types/get-drivers.js';

const PATH = '/drivers';

export async function getDrivers(
  client: AxiosInstance,
  params: DriversQuery,
): Promise<GetDriversListResponse> {
  const url = `${API_BASE}${PATH}`;
  return get<GetDriversListResponse>(client, url, params);
}
