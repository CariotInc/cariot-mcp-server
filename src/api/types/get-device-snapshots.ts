export interface DeviceSnapshotQuery {
  device_uid: string;
}

export interface State {
  code: string;
  type: string;
  label: string;
  color: string;
}

export interface Destination {
  point_id: string;
  point_name: string;
  latitude: number;
  longitude: number;
}

export interface AlcoholCheck {
  status: 'DISABLED' | 'NONE' | 'CHECKED' | 'ON_ALCOHOL' | 'UNCHECKED' | 'UNKNOWN';
}

export interface DeviceSnapshotItem {
  device_uid: string;
  contract_status: number;
  last_received_time: number;
  gps_time: number;
  latitude: number;
  longitude: number;
  speed: number;
  direction: number;
  state: State | null;
  route_prediction: string;
  estimated_duration: number;
  destination: Destination | null;
  stop_status: 'HIDE' | 'DRIVE' | 'WARN' | 'STOP';
  stop_duration: number;
  alcohol_check: AlcoholCheck;
}

export interface GetDeviceSnapshotsResponse {
  items: DeviceSnapshotItem[];
}
