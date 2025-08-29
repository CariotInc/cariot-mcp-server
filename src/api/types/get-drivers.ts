export interface DriversQuery {
  driver_name?: string;
  limit?: number;
}

export interface DriverItem {
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_name: string;
  device_uid: string;
  business_office: string;
  department: string;
  mail: string;
  mail2: string;
  license_number: string;
  license_acquisition_date: string;
  license_expiration_date: string;
  hired_date: string;
  resignation_date: string;
}

export interface GetDriversListResponse {
  items: DriverItem[];
}
