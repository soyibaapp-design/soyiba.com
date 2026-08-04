type LocalFallback<T> = () => T | Promise<T>;

type AppsScriptCallOptions = {
  timeoutMs?: number;
};

const moduleEndpoints: Record<string, string | undefined> = {
  Auth: import.meta.env.VITE_APPS_SCRIPT_AUTH_URL,
  Inicio: import.meta.env.VITE_APPS_SCRIPT_INICIO_URL,
  Publicaciones: import.meta.env.VITE_APPS_SCRIPT_PUBLICACIONES_URL,
  Miembros:
    import.meta.env.VITE_APPS_SCRIPT_MIEMBROS_URL ||
    import.meta.env.VITE_APPS_SCRIPT_AUTH_URL ||
    import.meta.env.VITE_APPS_SCRIPT_INICIO_URL,
  Donaciones:
    import.meta.env.VITE_APPS_SCRIPT_DONACIONES_URL ||
    import.meta.env.VITE_APPS_SCRIPT_INICIO_URL ||
    import.meta.env.VITE_APPS_SCRIPT_PUBLICACIONES_URL ||
    import.meta.env.VITE_APPS_SCRIPT_AUTH_URL,
};

export function getAppsScriptEndpoint(moduleName: string) {
  return moduleEndpoints[moduleName] || import.meta.env.VITE_APPS_SCRIPT_URL || '';
}

export async function callAppsScript<T>(
  moduleName: string,
  action: string,
  data: Record<string, unknown>,
  localFallback?: LocalFallback<T>,
  options: AppsScriptCallOptions = {},
): Promise<T> {
  const endpoint = getAppsScriptEndpoint(moduleName);

  if (!endpoint) {
    if (localFallback) {
      return localFallback();
    }

    throw new Error(`Falta configurar el endpoint de Apps Script para ${moduleName}.`);
  }

  const controller = new AbortController();
  const timeoutId = options.timeoutMs
    ? globalThis.setTimeout(() => controller.abort(), options.timeoutMs)
    : undefined;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ module: moduleName, action, data }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Apps Script tardo demasiado para ${moduleName}.`);
    }

    throw error;
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  }

  const text = await response.text();
  const trimmedText = text.trimStart();

  if (trimmedText && !trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
    throw new Error(`Apps Script devolvio una respuesta no JSON para ${moduleName}.`);
  }

  let parsed: T;

  try {
    parsed = trimmedText ? (JSON.parse(trimmedText) as T) : ({} as T);
  } catch {
    throw new Error(`Apps Script devolvio JSON invalido para ${moduleName}.`);
  }

  if (!response.ok) {
    throw new Error(`Apps Script respondio ${response.status} para ${moduleName}.`);
  }

  return parsed;
}
