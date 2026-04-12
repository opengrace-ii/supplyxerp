export type User = {
  user_id: string;
  username: string;
  role: 'admin' | 'manager' | 'operator' | string;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  base_uom: string;
};

export type HU = {
  id: string;
  code: string;
  material_code: string;
  quantity: number;
  uom: string;
  status: string;
  location_code: string;
  parent_hu_id?: string;
  version_number: number;
  last_event_at: string;
};

export type AgentStepStatus = 'SUCCESS' | 'FAILED' | 'BLOCKED';

export type AgentStep = {
  trace_id: string;
  step_order: number;
  agent: string;
  action: string;
  status: AgentStepStatus;
  timestamp: string;
  data: Record<string, unknown>;
};

export type WSEvent = {
  type: 'agent_trace' | 'trace_started' | 'trace_completed' | string;
  payload: AgentStep | Record<string, unknown>;
};

export type ExecutionTrace = {
  trace_id: string;
  request_type: string;
  status: string;
  actor_user_id: string;
  request_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
  steps: AgentStep[];
};

export type ScanRequest = {
  barcode: string;
};

export type MoveRequest = {
  barcode: string;
  target_location: string;
};

export type ConsumeRequest = {
  barcode: string;
  quantity: number;
  mode?: 'consume' | 'split';
};

export type OperationResponse = {
  trace_id: string;
  [key: string]: unknown;
};

export type InventoryResponse = {
  products: Product[];
  handling_units: HU[];
};

export type LineageResponse = {
  lineage: HU[];
};
