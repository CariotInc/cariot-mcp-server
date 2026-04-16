import { FetchClient } from '../lib/http-client.js';
import { API_BASE, get } from './api-utils.js';
import { DeviceSnapshotQuery, GetDeviceSnapshotsResponse } from './types/get-device-snapshots.js';

const PATH = '/device_snapshots';

export async function getDeviceSnapshots(
  client: FetchClient,
  params: DeviceSnapshotQuery,
): Promise<GetDeviceSnapshotsResponse> {
  const url = `${API_BASE}${PATH}`;
  return get<GetDeviceSnapshotsResponse>(client, url, params);
}
