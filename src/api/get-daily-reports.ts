import { FetchClient } from '../lib/http-client.js';
import { API_BASE, get } from './api-utils.js';
import { DailyReportsQuery, GetDailyReportsListResponse } from './types/get-daily-reports.js';

const PATH = '/daily_reports';

export async function getDailyReports(
  client: FetchClient,
  params: DailyReportsQuery,
): Promise<GetDailyReportsListResponse> {
  const url = `${API_BASE}${PATH}`;
  return get<GetDailyReportsListResponse>(client, url, params);
}
