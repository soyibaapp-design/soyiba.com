import { callAppsScript } from '../../services/appsScriptClient';

export type InicioMetric = {
  id: string;
  label: string;
  value: string;
};

export type InicioNotice = {
  id: string;
  title: string;
  body: string;
};

type InicioResponse = {
  ok: boolean;
  metrics: InicioMetric[];
  notices: InicioNotice[];
  updatedAt?: string;
};

export async function getInicioSummary() {
  return callAppsScript<InicioResponse>('Inicio', 'summary', {}, () => ({
    ok: true,
    updatedAt: new Date().toISOString(),
    metrics: [
      { id: 'usuarios_activos', label: 'Usuarios', value: '0' },
      { id: 'solicitudes_hoy', label: 'Solicitudes', value: '0' },
      { id: 'alertas', label: 'Alertas', value: '0' },
    ],
    notices: [
      {
        id: 'local',
        title: 'Modulo local',
        body: 'Inicio listo para conectar con Apps Script.',
      },
    ],
  }));
}
