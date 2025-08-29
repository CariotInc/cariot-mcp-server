import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDeviceSnapshots } from '../api/get-device-snapshots.js';
import { DeviceSnapshotQuery } from '../api/types/get-device-snapshots.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEmptyResponse,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

interface RealtimeParams {
  deviceUids: string;
}

const handler = (authProvider: CariotApiAuthProvider): ToolHandler => {
  return async (params: unknown): Promise<CallToolResult> => {
    const typedParams = params as RealtimeParams;
    const queryParams: DeviceSnapshotQuery = {
      device_uid: typedParams.deviceUids,
    };

    try {
      const client = authProvider.getAuthedClient();
      const response = await getDeviceSnapshots(client, queryParams);
      const items = response.items || [];
      if (items.length === 0) {
        return formatEmptyResponse('API call successful but no realtime data found.');
      }
      return formatSuccessResponse(response);
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

export const realtimeTool = {
  name: 'get_realtime',
  config: {
    titleEn: 'Get Realtime',
    titleJa: 'リアルタイム情報取得',
    descriptionEn: 'Retrieves real-time information for the specified driver or vehicle.',
    descriptionJa: '指定したドライバーまたは車両のリアルタイム情報を取得します。',
    inputSchema: {
      deviceUids: z
        .string()
        .refine(
          (val) =>
            val
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
              .every((s) => /^\w+-\w+$/.test(s)),
          { message: 'Each device UID must match ^\\w+-\\w+$' },
        )
        .describe(
          formatEnJaWithSlash(
            'Comma separated device UID list (required).',
            '取得するデバイスUIDのカンマ区切りリスト (必須)。',
          ),
        ),
    },
  },
  handler,
};
