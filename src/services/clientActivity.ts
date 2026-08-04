export type ClientCallSnapshot = {
  activeCallCount: number;
  activeCallsByAction: Record<string, number>;
  totalCalls: number;
};

const activeCallsByAction = new Map<string, number>();
let activeCallCount = 0;
let totalCalls = 0;

export function startTrackedClientCall(moduleName: string, action: string) {
  const key = `${normalizeCallPart(moduleName)}.${normalizeCallPart(action)}`;
  activeCallCount += 1;
  totalCalls += 1;
  activeCallsByAction.set(key, (activeCallsByAction.get(key) || 0) + 1);

  let finished = false;

  return () => {
    if (finished) {
      return;
    }

    finished = true;
    activeCallCount = Math.max(0, activeCallCount - 1);
    const nextValue = Math.max(0, (activeCallsByAction.get(key) || 0) - 1);

    if (nextValue > 0) {
      activeCallsByAction.set(key, nextValue);
    } else {
      activeCallsByAction.delete(key);
    }
  };
}

export function getClientCallSnapshot(): ClientCallSnapshot {
  return {
    activeCallCount,
    activeCallsByAction: Object.fromEntries(activeCallsByAction.entries()),
    totalCalls,
  };
}

function normalizeCallPart(value: unknown) {
  return String(value || 'unknown').trim() || 'unknown';
}
