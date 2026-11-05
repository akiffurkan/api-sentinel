export type MonitorStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'RECOVERED' | 'PENDING';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface Monitor {
  id: string;
  name: string;
  url: string;
  interval_seconds: number;
  timeout_seconds: number;
  expected_status_codes: number[];
  enabled: boolean;
  current_status: MonitorStatus;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
  next_check_at: string;
  last_checked_at: string | null;
  uptime_percentage: number | null;
  average_latency_ms: number | null;
}

export interface CheckResult {
  id: string;
  monitor_id: string;
  status_code: number | null;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  checked_at: string;
}

export interface Incident {
  id: string;
  monitor_id: string;
  monitor_name?: string;
  monitor_url?: string;
  status: IncidentStatus;
  reason: string;
  started_at: string;
  resolved_at: string | null;
  duration_seconds: number | null;
}

export interface MonitorDetail extends Monitor {
  p95_latency_ms: number | null;
  min_latency_ms: number | null;
  max_latency_ms: number | null;
  total_checks_count: number;
  recent_checks: CheckResult[];
  active_incident: Incident | null;
  recent_incidents: Incident[];
}

export interface OverviewCounts {
  total: number;
  up: number;
  degraded: number;
  down: number;
  recovered: number;
  pending: number;
  paused: number;
}

export interface OverviewData {
  monitors_count: OverviewCounts;
  overall_uptime_percentage: number;
  uptime_calculation_note: string;
  average_latency_ms: number;
  open_incidents_count: number;
  monitors: Monitor[];
  recent_incidents: Incident[];
}

export interface AuthStatus {
  auth_required: boolean;
  app_name: string;
  version: string;
  app_env: string;
}

export interface SettingsInfo {
  telegram: {
    configured: boolean;
    bot_token: string;
    chat_id: string;
  };
  engine: {
    default_interval: number;
    default_timeout: number;
    max_concurrent_checks: number;
    worker_poll_interval: number;
  };
  security: {
    allowed_ports: number[];
    max_redirects: number;
    max_response_bytes: number;
  };
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  interval_seconds: number;
  timeout_seconds: number;
  expected_status_codes: number[];
  enabled: boolean;
}

export interface UpdateMonitorInput {
  name?: string;
  url?: string;
  interval_seconds?: number;
  timeout_seconds?: number;
  expected_status_codes?: number[];
  enabled?: boolean;
}
