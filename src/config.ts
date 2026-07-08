import dotenv from 'dotenv';
import { ConfluenceConfig } from './types.js';

dotenv.config();

export function getConfig(): ConfluenceConfig {
  const baseUrl = process.env.CONFLUENCE_BASE_URL;
  const apiToken = process.env.CONFLUENCE_API_TOKEN;
  const allowedSpaces = process.env.ALLOWED_SPACES;

  if (!baseUrl) {
    throw new Error('CONFLUENCE_BASE_URL environment variable is required');
  }

  if (!apiToken) {
    throw new Error('CONFLUENCE_API_TOKEN environment variable is required (a Personal Access Token for Data Center/Server)');
  }

  if (!allowedSpaces) {
    throw new Error('ALLOWED_SPACES environment variable is required');
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiToken,
    allowedSpaces: allowedSpaces.split(',').map(s => s.trim()),
    debug: process.env.DEBUG === 'true'
  };
}

export function validateSpaceAccess(spaceKey: string, allowedSpaces: string[]): boolean {
  return allowedSpaces.includes(spaceKey);
}