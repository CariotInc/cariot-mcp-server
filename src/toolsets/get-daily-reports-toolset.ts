import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDailyReports } from '../api/get-daily-reports.js';
import { DailyReportsQuery } from '../api/types/get-daily-reports.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEmptyResponse,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

interface DailyReportsParams {
  driverName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

const handler = (authProvider: CariotApiAuthProvider): ToolHandler => {
  return async (params: unknown): Promise<CallToolResult> => {
    const typedParams = params as DailyReportsParams;
    const queryParams: DailyReportsQuery = {
      driver_name: typedParams.driverName,
      date_from: typedParams.dateFrom,
      date_to: typedParams.dateTo,
      limit: typedParams.limit,
    };

    try {
      const client = authProvider.getAuthedClient();
      const response = await getDailyReports(client, queryParams);

      const reports = response.items || [];
      if (reports.length === 0) {
        return formatEmptyResponse('API call successful but no daily reports found.');
      }

      return formatSuccessResponse(response);
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

export const dailyReportsTool = {
  name: 'get_daily_reports',
  config: {
    titleEn: 'Get Daily Reports',
    titleJa: '運転報告一覧取得',
    descriptionEn:
      'Retrieves a list of daily reports for all drivers within a specified date range.',
    descriptionJa: '指定された日付範囲内の全ドライバーの日報をリストで取得します。',
    inputSchema: {
      driverName: z
        .string()
        .optional()
        .describe(
          formatEnJaWithSlash(
            'Driver name (partial match, put a space between family and given name)',
            'ドライバー名（部分一致。姓と名の間に必ずスペースを入れてください）',
          ),
        ),
      dateFrom: z
        .string()
        .optional()
        .describe(formatEnJaWithSlash('Start date (yyyy-MM-dd)', '開始日 (yyyy-MM-dd)')),
      dateTo: z
        .string()
        .optional()
        .describe(formatEnJaWithSlash('End date (yyyy-MM-dd)', '終了日 (yyyy-MM-dd)')),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe(
          formatEnJaWithSlash(
            'Number of results to retrieve (default: 100, max: 500)',
            '取得件数 (デフォルト:100, 最大:500)',
          ),
        ),
    },
  },
  handler,
};
