type LocalFallback<T> = () => T | Promise<T>;

const moduleEndpoints: Record<string, string | undefined> = {
  Auth: import.meta.env.VITE_APPS_SCRIPT_AUTH_URL,
  Inicio: import.meta.env.VITE_APPS_SCRIPT_INICIO_URL,
  Publicaciones: import.meta.env.VITE_APPS_SCRIPT_PUBLICACIONES_URL,
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
): Promise<T> {
  const endpoint = getAppsScriptEndpoint(moduleName);

  if (!endpoint) {
    if (localFallback) {
      return localFallback();
    }

    throw new Error(`Falta configurar el endpoint de Apps Script para ${moduleName}.`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ module: moduleName, action, data }),
  });

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new Error(`Apps Script respondio ${response.status} para ${moduleName}.`);
  }

  return parsed;
}
