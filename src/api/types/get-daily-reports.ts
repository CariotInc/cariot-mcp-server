export interface DailyReportsQuery {
  driver_name?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface DailyReport {
  daily_report_no: string;
  driver_id: string;
  driver_name: string;
  department: string;
  business_office: string;
  date: string;
  distance: number;
  duration: number;
  vehicles: string;
  start_address: string;
  started_at: number;
  end_address: string;
  ended_at: number;
}

export interface GetDailyReportsListResponse {
  items: DailyReport[];
}
