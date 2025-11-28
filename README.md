# Cariot MCP Server

A Model Context Protocol (MCP) server with cariot APIs.

## Quick Start

### Prerequisites

- Node.js v22+ (ES modules support)
- Cariot API credentials (one of the following):
  - API Access Key and Secret
  - ID Token (from Cariot authentication)

### Configuration

Add the following configuration to your MCP-enabled client (e.g., Claude Desktop) settings.

#### Option 1: API Key Authentication (Recommended)

```json
{
  "mcpServers": {
    "cariot": {
      "command": "npx",
      "args": ["@cariot-labs/cariot-mcp-server"],
      "env": {
        "API_ACCESS_KEY": "your-api-access-key",
        "API_ACCESS_SECRET": "your-api-access-secret"
      }
    }
  }
}
```

#### Option 2: ID Token Authentication

```json
{
  "mcpServers": {
    "cariot": {
      "command": "npx",
      "args": ["@cariot-labs/cariot-mcp-server"],
      "env": {
        "ID_TOKEN": "your-id-token"
      }
    }
  }
}
```

### Environment Variables

**Authentication (one of the following is required):**

| Variable            | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `API_ACCESS_KEY`    | Cariot API access key (used with `API_ACCESS_SECRET`) |
| `API_ACCESS_SECRET` | Cariot API access secret (used with `API_ACCESS_KEY`) |
| `ID_TOKEN`          | Cariot ID token for authentication                    |

> **Note:** If both API key credentials and ID token are provided, API key authentication takes priority.

**Optional:**

| Variable           | Description                              | Default |
| ------------------ | ---------------------------------------- | ------- |
| `CARIOT_LOG_LEVEL` | Logging level (debug, info, warn, error) | info    |

### No Installation Required

npx automatically downloads and runs the server.

## Available Tools

### Cariot Tools

- **analyze_alcohol_checks**: Analyze alcohol check results from daily reports to monitor compliance and identify violations.
- **get_daily_report**: Get a specific daily report by daily report number.
- **get_daily_reports**: List daily reports.
- **get_drivers**: List drivers.
- **get_vehicles**: List vehicles.
- **get_realtime**: Get realtime snapshots for devices.

### Utility Tools

- **generate_chart_config**: Generate Chart.js configuration data based on input data. Supports bar, line, pie, doughnut, radar, and polarArea chart types. This tool can be used to visualize data obtained from other tools.

## Development

### Local Development

```bash
# Clone repository
git clone https://github.com/CariotInc/cariot-mcp-server.git
cd cariot-mcp-server
npm install

# Test
npm test

# Build
npm run build
```

### Local Configuration

**Using API Key:**

```json
{
  "mcpServers": {
    "cariot": {
      "command": "node",
      "args": ["/path/to/cariot-mcp-server/dist/index.js"],
      "env": {
        "API_ACCESS_KEY": "your-access-key",
        "API_ACCESS_SECRET": "your-access-secret",
        "CARIOT_LOG_LEVEL": "debug"
      }
    }
  }
}
```

## License

MIT
