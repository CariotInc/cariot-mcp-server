export interface Environment {
  apiAccessKey: string;
  apiAccessSecret: string;
}

export function getEnvironment(): Environment {
  const apiAccessKey = process.env.API_ACCESS_KEY;
  const apiAccessSecret = process.env.API_ACCESS_SECRET;

  if (!apiAccessKey || !apiAccessSecret) {
    throw new Error(
      'API credentials are required: Please set API_ACCESS_KEY and API_ACCESS_SECRET environment variables',
    );
  }

  return {
    apiAccessKey,
    apiAccessSecret,
  };
}
