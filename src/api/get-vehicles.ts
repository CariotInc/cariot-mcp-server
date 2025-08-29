import { AxiosInstance } from 'axios';
import { API_BASE, get } from './api-utils.js';
import { GetVehiclesListResponse, VehiclesQuery } from './types/get-vehicles.js';

const PATH = '/vehicles';

export async function getVehicles(
  client: AxiosInstance,
  params: VehiclesQuery,
): Promise<GetVehiclesListResponse> {
  const url = `${API_BASE}${PATH}`;
  return get<GetVehiclesListResponse>(client, url, params);
}
