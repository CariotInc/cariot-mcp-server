import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDailyReport } from '../api/get-daily-report.js';
import { DailyReportQuery } from '../api/types/get-daily-report.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

interface DailyReportParams {
  dailyReportNo: string;
}

const handler = (authProvider: CariotApiAuthProvider): ToolHandler => {
  return async (params: unknown): Promise<CallToolResult> => {
    const typedParams = params as DailyReportParams;
    const queryParams: DailyReportQuery = {
      daily_report_no: typedParams.dailyReportNo,
    };

    try {
      const client = authProvider.getAuthedClient();
      const response = await getDailyReport(client, queryParams);

      const responseWithoutMetrics = {
        ...response,
        rides: response.rides.map(({ metrics, ...rideRest }) => {
          return rideRest;
        }),
      };

      return formatSuccessResponse(responseWithoutMetrics);
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

export const dailyReportTool = {
  name: 'get_daily_report',
  config: {
    titleEn: 'Get Daily Report',
    titleJa: '運転報告詳細取得',
    descriptionEn: 'Retrieves a detailed daily report for a specific date and driver.',
    descriptionJa: '指定された日付とドライバーの日報詳細を取得します。',
    inputSchema: {
      dailyReportNo: z
        .string()
        .describe(formatEnJaWithSlash('Daily report number (required)', '日報番号 (必須)')),
    },
  },
  handler,
};
