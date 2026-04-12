import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { AgentTracePanel } from '../components/AgentTracePanel';
import { ContextPanel } from '../components/ContextPanel';
import { InventoryView } from '../components/InventoryView';
import { OperationPanel, type OperatorAction } from '../components/OperationPanel';
import type { AgentStep, HU, InventoryResponse, OperationResponse, User, WSEvent } from '../types';
import type { OperationMode } from '../components/ModeSelector';

type Props = {
  user: User;
  onLogout: () => Promise<void>;
};

type ActionState = {
  enabled: boolean;
  reason: string;
};

const CLOSED_STATUSES = new Set(['CONSUMED', 'SPLIT_CLOSED', 'BLOCKED', 'CLOSED']);
const OPERABLE_STATUSES = new Set(['AVAILABLE', 'STORED']);

function mergeSteps(existing: AgentStep[], incoming: AgentStep[]): AgentStep[] {
  const map = new Map<string, AgentStep>();
  for (const step of existing) {
    map.set(`${step.trace_id}-${step.step_order}`, step);
  }
  for (const step of incoming) {
    map.set(`${step.trace_id}-${step.step_order}`, step);
  }
  return [...map.values()].sort((a, b) => {
    if (a.timestamp === b.timestamp) {
      return a.step_order - b.step_order;
    }
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
}

function extractHUCode(response: OperationResponse, fallback: string): string {
  const hu = response.hu;
  if (hu && typeof hu === 'object' && 'code' in hu && typeof hu.code === 'string') {
    return hu.code;
  }
  return fallback;
}

export function DashboardPage({ user, onLogout }: Props) {
  const [mode, setMode] = useState<OperationMode>('RECEIVING');
  const [barcode, setBarcode] = useState('HU-1001');
  const [targetLocation, setTargetLocation] = useState('STOR-01');
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [selectedHUCode, setSelectedHUCode] = useState('');
  const [selectedHU, setSelectedHU] = useState<HU | null>(null);
  const [lineage, setLineage] = useState<HU[]>([]);
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [activeTraceId, setActiveTraceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lineageLoading, setLineageLoading] = useState(false);
  const [wsState, setWsState] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>('CONNECTING');
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [traceOnlyErrors, setTraceOnlyErrors] = useState(false);
  const [traceOnlyLastOperation, setTraceOnlyLastOperation] = useState(false);
  const [traceDebugVisible, setTraceDebugVisible] = useState(false);

  const resolveHUContext = useCallback(
    async (snapshot: InventoryResponse, forcedCode?: string) => {
      const code = (forcedCode ?? selectedHUCode).trim().toUpperCase();
      if (!code) {
        setSelectedHU(null);
        setLineage([]);
        return;
      }
      const found = snapshot.handling_units.find((hu) => hu.code === code) ?? null;
      setSelectedHU(found);
      if (!found) {
        setLineage([]);
        return;
      }
      setLineageLoading(true);
      try {
        const lineageRes = await api.lineage(found.id);
        setLineage(lineageRes.lineage);
      } catch {
        setLineage([found]);
      } finally {
        setLineageLoading(false);
      }
    },
    [selectedHUCode],
  );

  const refreshInventory = useCallback(
    async (forcedCode?: string) => {
      const payload = await api.inventory();
      setInventory(payload);
      await resolveHUContext(payload, forcedCode);
      return payload;
    },
    [resolveHUContext],
  );

  useEffect(() => {
    void refreshInventory();
  }, [refreshInventory]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socket.onopen = () => setWsState('OPEN');
    socket.onclose = () => setWsState('CLOSED');
    socket.onerror = () => setWsState('CLOSED');
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as WSEvent;
        if (event.type === 'agent_trace') {
          const step = event.payload as AgentStep;
          setSteps((current) => mergeSteps(current, [step]));
        }
        if (event.type === 'trace_completed') {
          const payload = event.payload as Record<string, unknown>;
          const traceId = typeof payload.trace_id === 'string' ? payload.trace_id : '';
          if (traceId) {
            setActiveTraceId(traceId);
            void refreshInventory(selectedHUCode);
          }
        }
      } catch {
        // Ignore malformed WebSocket payloads.
      }
    };
    return () => socket.close();
  }, [refreshInventory, selectedHUCode]);

  const runAction = useCallback(
    async (action: OperatorAction, payload?: { quantity?: number }) => {
      const code = (selectedHU?.code || barcode).trim().toUpperCase();
      setError('');

      if (action === 'create_hu') {
        setError('Create HU is not available on the current API contract.');
        return;
      }
      if (action === 'pick') {
        setError('Pick workflow is reserved for a future dispatch release.');
        return;
      }
      if (!code) {
        setError('Scan an HU barcode first.');
        return;
      }

      setBusy(true);
      try {
        let response: OperationResponse;
        if (action === 'scan') {
          response = await api.scan({ barcode: code });
          const resolvedCode = extractHUCode(response, code);
          setLastScannedCode(resolvedCode);
          setSelectedHUCode(resolvedCode);
          setBarcode(resolvedCode);
          await refreshInventory(resolvedCode);
        } else if (action === 'move') {
          response = await api.move({ barcode: code, target_location: targetLocation });
          await refreshInventory(code);
        } else {
          const quantity = payload?.quantity ?? 0;
          response = await api.consume({
            barcode: code,
            quantity,
            mode: action === 'split' ? 'split' : 'consume',
          });
          await refreshInventory(code);
        }

        if (typeof response.trace_id === 'string') {
          setActiveTraceId(response.trace_id);
          const trace = await api.trace(response.trace_id);
          setSteps((current) => mergeSteps(current, trace.steps));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Operation failed');
      } finally {
        setBusy(false);
      }
    },
    [barcode, refreshInventory, selectedHU, targetLocation],
  );

  const actionStates = useMemo<Record<OperatorAction, ActionState>>(() => {
    const hasBarcode = barcode.trim().length > 0;
    const hasHU = Boolean(selectedHU);
    const huStatus = selectedHU?.status.toUpperCase() ?? '';
    const closed = CLOSED_STATUSES.has(huStatus);
    const operable = OPERABLE_STATUSES.has(huStatus);

    return {
      scan: {
        enabled: hasBarcode,
        reason: hasBarcode ? '' : 'Scan input is required.',
      },
      create_hu: {
        enabled: false,
        reason: 'Create HU endpoint is not available yet.',
      },
      move: {
        enabled: hasHU && !closed && targetLocation.trim().length > 0,
        reason: !hasHU
          ? 'Scan an HU first.'
          : targetLocation.trim().length === 0
            ? 'Target location is required.'
            : closed
              ? 'Closed HUs cannot be moved.'
              : '',
      },
      consume: {
        enabled: hasHU && operable,
        reason: !hasHU ? 'Scan an HU first.' : operable ? '' : 'Only AVAILABLE/STORED HUs can be consumed.',
      },
      split: {
        enabled: hasHU && operable,
        reason: !hasHU ? 'Scan an HU first.' : operable ? '' : 'Only AVAILABLE/STORED HUs can be split.',
      },
      pick: {
        enabled: false,
        reason: 'Dispatch pick flow is a future-ready placeholder.',
      },
    };
  }, [barcode, selectedHU, targetLocation]);

  const nextStepHint = useMemo(() => {
    if (!selectedHU) {
      return 'Scan a handling unit to begin. The system will unlock only valid actions.';
    }
    if (mode === 'PUTAWAY') {
      return 'Confirm target location and execute Move.';
    }
    if (mode === 'PRODUCTION') {
      return 'Choose Consume or Split. Quantity is requested after button click.';
    }
    if (mode === 'DISPATCH') {
      return 'Pick flow is reserved for a future release.';
    }
    return 'Use scan for receiving verification. Create HU is kept disabled until API is available.';
  }, [mode, selectedHU]);

  return (
    <main className="ops-root">
      <header className="ops-header">
        <div>
          <h1>ERPLite Warehouse Execution</h1>
          <p>
            Operator: <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button className="btn ghost" onClick={() => void onLogout()}>
          Logout
        </button>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="ops-layout">
        <div className="ops-col operation-col">
          <OperationPanel
            mode={mode}
            barcode={barcode}
            targetLocation={targetLocation}
            lastScannedCode={lastScannedCode}
            busy={busy}
            nextStepHint={nextStepHint}
            actionStates={actionStates}
            onModeChange={setMode}
            onBarcodeChange={setBarcode}
            onTargetLocationChange={setTargetLocation}
            onRunAction={runAction}
          />
          <InventoryView handlingUnits={inventory?.handling_units ?? []} />
        </div>

        <div className="ops-col">
          <ContextPanel
            selectedHU={selectedHU}
            products={inventory?.products ?? []}
            lineage={lineage}
            loading={lineageLoading}
          />
        </div>

        <div className="ops-col">
          <AgentTracePanel
            wsState={wsState}
            steps={steps}
            activeTraceId={activeTraceId}
            expanded={traceExpanded}
            debugVisible={traceDebugVisible}
            onlyErrors={traceOnlyErrors}
            onlyLastOperation={traceOnlyLastOperation}
            onToggleExpanded={() => setTraceExpanded((current) => !current)}
            onToggleErrors={setTraceOnlyErrors}
            onToggleLastOperation={setTraceOnlyLastOperation}
            onToggleDebug={setTraceDebugVisible}
            onClearLogs={() => setSteps([])}
          />
        </div>
      </section>
    </main>
  );
}
