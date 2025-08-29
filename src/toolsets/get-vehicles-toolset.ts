import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getVehicles } from '../api/get-vehicles.js';
import { VehiclesQuery } from '../api/types/get-vehicles.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEmptyResponse,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

interface VehiclesParams {
  vehicleName?: string;
  limit?: number;
}

const handler = (authProvider: CariotApiAuthProvider): ToolHandler => {
  return async (params: unknown): Promise<CallToolResult> => {
    const typedParams = params as VehiclesParams;
    const queryParams: VehiclesQuery = {
      vehicle_name: typedParams.vehicleName,
      limit: typedParams.limit,
    };

    try {
      const client = authProvider.getAuthedClient();
      const response = await getVehicles(client, queryParams);
      const items = response.items || [];
      if (items.length === 0) {
        return formatEmptyResponse('API call successful but no vehicles found.');
      }
      return formatSuccessResponse(response);
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

export const vehiclesTool = {
  name: 'get_vehicles',
  config: {
    titleEn: 'Get Vehicles',
    titleJa: '車両一覧取得',
    descriptionEn: "Retrieves a list of all vehicles' information.",
    descriptionJa: '全車両の情報をリストで取得します。',
    inputSchema: {
      vehicleName: z
        .string()
        .optional()
        .describe(formatEnJaWithSlash('Vehicle name (partial match)', '車両名（部分一致）')),
      limit: z
        .number()
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
