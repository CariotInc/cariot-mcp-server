export interface VehiclesQuery {
  vehicle_name?: string;
  limit?: number;
}

export interface VehicleItem {
  vehicle_id: string;
  vehicle_name: string;
  driver_id: string;
  driver_name: string;
  device_uid: string;
  description: string;
  disposal_date: string;
  lease_start: string;
  lease_end: string;
}

export interface GetVehiclesListResponse {
  items: VehicleItem[];
}
