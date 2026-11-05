import {
  AuthStatus,
  CheckResult,
  CreateMonitorInput,
  Incident,
  Monitor,
  MonitorDetail,
  OverviewData,
  SettingsInfo,
  UpdateMonitorInput,
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiError';
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('sentinel_admin_token');
  if (token) {
    return { Authorization: `Bearer ${token.trim()}` };
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const data = await response.json();
      errorDetail = data.detail || data.message || JSON.stringify(data);
    } catch {
      // response was not JSON
    }
    throw new ApiError(response.status, errorDetail);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  getAuthStatus: () => request<AuthStatus>('/auth/status'),
  verifyToken: () => request<{ valid: boolean; message: string }>('/auth/verify', { method: 'POST' }),

  // Overview
  getOverview: () => request<OverviewData>('/overview'),

  // Monitors
  getMonitors: (enabledOnly = false) =>
    request<Monitor[]>(`/monitors${enabledOnly ? '?enabled_only=true' : ''}`),
  getMonitor: (id: string) => request<MonitorDetail>(`/monitors/${id}`),
  createMonitor: (input: CreateMonitorInput) =>
    request<Monitor>('/monitors', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateMonitor: (id: string, input: UpdateMonitorInput) =>
    request<Monitor>(`/monitors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteMonitor: (id: string) =>
    request<{ message: string; success: boolean }>(`/monitors/${id}`, {
      method: 'DELETE',
    }),
  getMonitorChecks: (id: string, limit = 50, offset = 0) =>
    request<CheckResult[]>(`/monitors/${id}/checks?limit=${limit}&offset=${offset}`),
  checkNow: (id: string) =>
    request<CheckResult>(`/monitors/${id}/check-now`, {
      method: 'POST',
    }),

  // Incidents
  getIncidents: (status?: string, monitorId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (monitorId) params.append('monitor_id', monitorId);
    const query = params.toString();
    return request<Incident[]>(`/incidents${query ? `?${query}` : ''}`);
  },

  // Settings
  getSettingsInfo: () => request<SettingsInfo>('/settings/info'),
  testTelegramAlert: () =>
    request<{ success: boolean; message: string; bot_token: string; chat_id: string }>(
      '/settings/telegram-test',
      { method: 'POST' }
    ),
};
