export const IPC_CHANNELS = {
  // System & Health
  APP_GET_SYSTEM_INFO: 'app:get-system-info',
  APP_PING: 'app:ping',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // Providers & Credentials
  PROVIDERS_LIST: 'providers:list',
  PROVIDERS_SAVE_CREDENTIAL: 'providers:save-credential',
  PROVIDERS_DELETE_CREDENTIAL: 'providers:delete-credential',
  PROVIDERS_VALIDATE_CREDENTIAL: 'providers:validate-credential',
  PROVIDERS_TEST_CONNECTION: 'providers:test-connection',
  PROVIDERS_GET_HEALTH_STATUSES: 'providers:get-health-statuses',
  PROVIDERS_SET_ENABLED: 'providers:set-enabled',

  // Models
  MODELS_LIST_AVAILABLE: 'models:list-available',

  // Conversations & Agent
  CONVERSATIONS_LIST: 'conversations:list',
  CONVERSATIONS_GET: 'conversations:get',
  CONVERSATIONS_DELETE: 'conversations:delete',
  AGENT_START_CONVERSATION: 'agent:start-conversation',
  AGENT_SEND_PROMPT: 'agent:send-prompt',
  AGENT_CANCEL_RUN: 'agent:cancel-run',
  AGENT_STREAM_TOKEN: 'agent:stream-token',
  AGENT_ACTIVITY_EVENT: 'agent:activity-event',
  AGENT_FAILOVER: 'agent:failover',

  // Permissions & Broker
  PERMISSION_REQUEST: 'permission:request',
  PERMISSION_RESPOND: 'permission:respond',

  // Workspace & Filesystem
  WORKSPACE_SELECT_FOLDER: 'workspace:select-folder',
  WORKSPACE_GET_CURRENT: 'workspace:get-current',
  WORKSPACE_SET: 'workspace:set',
  WORKSPACE_INSPECT_FILES: 'workspace:inspect-files',

  // Diff & Patching
  DIFF_REVIEW_PATCH: 'diff:review-patch',
  DIFF_APPLY_PATCH: 'diff:apply-patch',

  // Settings & Privacy
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
  SETTINGS_PURGE_DATA: 'settings:purge-data',

  // Terminal
  TERMINAL_CREATE_SESSION: 'terminal:create-session',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

