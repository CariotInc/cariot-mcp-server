import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import { formatConfig } from './base-toolset.js';
import { dailyReportTool } from './get-daily-report-toolset.js';
import { dailyReportsTool } from './get-daily-reports-toolset.js';
import { driversTool } from './get-drivers-toolset.js';
import { realtimeTool } from './get-realtime-toolset.js';
import { vehiclesTool } from './get-vehicles-toolset.js';

const allTools = [
  dailyReportTool,
  dailyReportsTool,
  driversTool,
  realtimeTool,
  vehiclesTool,
] as const;

export const registerAllTools = (server: McpServer, authProvider: CariotApiAuthProvider): void => {
  for (const tool of allTools) {
    server.registerTool(tool.name, formatConfig(tool.config), tool.handler(authProvider));
  }
};
