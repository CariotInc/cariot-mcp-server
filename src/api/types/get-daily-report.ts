export interface DailyReportQuery {
  daily_report_no: string;
}

export interface VehicleRef {
  id: string;
  name: string;
}

export interface FieldValueSetItem {
  name: string;
  label: string;
  is_selected: boolean;
}

export interface Field {
  type: string;
  name: string;
  label: string;
  is_required: boolean;
  length: number;
  scale: number;
  value: string;
  value_set: FieldValueSetItem[];
  url: string;
}

export interface ActivityStateLog {
  log_id: string;
  started_at: number;
  ended_at: number;
  state_code: string;
  state_label: string;
}

export interface Activity {
  id: string;
  state_code: string;
  state_label: string;
  state_type: string;
  started_at: number;
  ended_at: number;
  distance: number;
  staying_id: string;
  point_id: string;
  point_name: string;
  point_address: string;
  point_latitude: number;
  point_longitude: number;
  start_latitude: number;
  start_longitude: number;
  fields: Field[];
  state_logs: ActivityStateLog[];
}

export interface GeoEvent {
  device_sn: string;
  started_at: number;
  ended_at: number;
  latitude: number;
  longitude: number;
  geo_route_id: string;
  geo_point_id: string;
  geo_point_name: string;
  geo_point_latitude: number;
  geo_point_longitude: number;
  account_name: string;
  account_address: string;
}

export interface ParkingEvent {
  device_sn: string;
  started_at: number;
  ended_at: number;
  latitude: number;
  longitude: number;
  address: string;
}

export interface Metrics {
  timestamp: number[];
  latitude: number[];
  longitude: number[];
  speed: number[];
  direction: number[];
}

export interface Ride {
  started_at: number;
  ended_at: number;
  device_uid: string;
  vehicle_id: string;
  vehicle_name: string;
  start_address: string;
  end_address: string;
  activities: Activity[];
  geo_events: GeoEvent[];
  parking_events: ParkingEvent[];
  metrics: Metrics;
}

export interface AccelEvent {
  event_type: string;
  description: string;
  started_at: number;
  ended_at: number;
  latitude: number;
  longitude: number;
  media_file_id: string;
}

export interface AlcoholCheck {
  created_at: number;
  created_by_sfid: string;
  created_by_name: string;
  type: string;
  vehicle_sfid: string;
  vehicle_name: string;
  checked_at_date: string;
  checked_at: number;
  driver_sfid: string;
  driver_name: string;
  checker_sfid: string;
  checker_name: string;
  alcohol_detector_sfid: string;
  alcohol_detector_name: string;
  check_method: string;
  check_method_detail: string;
  on_alcohol: boolean;
  alcohol_value: number;
  image1_key: string;
  image2_key: string;
  image1_url: string;
  image2_url: string;
  instructions: string;
  other_notice: string;
  modified_at: number;
  modified_by_sfid: string;
  modified_by_name: string;
  deleted: boolean;
  ble_selected: boolean;
}

export interface GetDailyReportResponse {
  date: string;
  clocked_in_at: number;
  clocked_out_at: number;
  distance: number;
  duration: number;
  vehicles: VehicleRef[];
  fields: Field[];
  rides: Ride[];
  accel_events: AccelEvent[];
  alcohol_checks?: AlcoholCheck[];
}
