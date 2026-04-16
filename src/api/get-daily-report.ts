import { FetchClient } from '../lib/http-client.js';
import { API_BASE, get } from './api-utils.js';
import { DailyReportQuery, GetDailyReportResponse } from './types/get-daily-report.js';

const PATH = '/daily_reports/report_no/:daily_report_no';

export async function getDailyReport(
  client: FetchClient,
  params: DailyReportQuery,
): Promise<GetDailyReportResponse> {
  const url = `${API_BASE}${PATH.replace(':daily_report_no', params.daily_report_no)}`;
  return get<GetDailyReportResponse>(client, url, params);
}
