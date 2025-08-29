import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDrivers } from '../api/get-drivers.js';
import { DriversQuery } from '../api/types/get-drivers.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEmptyResponse,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

interface DriversParams {
  driverName?: string;
  limit?: number;
}

const handler = (authProvider: CariotApiAuthProvider): ToolHandler => {
  return async (params: unknown): Promise<CallToolResult> => {
    const typedParams = params as DriversParams;
    const queryParams: DriversQuery = {
      driver_name: typedParams.driverName,
      limit: typedParams.limit,
    };

    try {
      const client = authProvider.getAuthedClient();
      const response = await getDrivers(client, queryParams);
      const items = response.items || [];
      if (items.length === 0) {
        return formatEmptyResponse('API call successful but no drivers found.');
      }
      return formatSuccessResponse(response);
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

export const driversTool = {
  name: 'get_drivers',
  config: {
    titleEn: 'Get Drivers',
    titleJa: 'ドライバー一覧取得',
    descriptionEn: "Retrieves a list of all drivers' information.",
    descriptionJa: '全ドライバーの情報をリストで取得します。',
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
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe(
          formatEnJaWithSlash(
            'Number of items to retrieve (default: 20, max: 50)',
            '取得件数（デフォルト：20、最大：50）',
          ),
        ),
    },
  },
  handler,
};
