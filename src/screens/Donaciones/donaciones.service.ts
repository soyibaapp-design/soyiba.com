import { callAppsScript } from '../../services/appsScriptClient';

export type DonationConfig = {
  id: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  nit: string;
  qrUrl: string;
  correoContacto: string;
  updatedAt: string;
  warning?: string;
};

type DonationConfigResponse = {
  ok: boolean;
  config?: unknown;
  error?: string;
  warning?: string;
};

const DONATION_CONFIG_ERROR =
  'No fue posible cargar la informacion de donacion. Por favor intenta mas tarde o comunicate con contabilidad.';

export async function getDonationConfig(): Promise<DonationConfig> {
  let response: DonationConfigResponse;

  try {
    response = await callAppsScript<DonationConfigResponse>('Donaciones', 'config', {});
  } catch {
    throw new Error(DONATION_CONFIG_ERROR);
  }

  if (!response.ok) {
    throw new Error(response.error || DONATION_CONFIG_ERROR);
  }

  const config = normalizeDonationConfig(response.config);

  if (!isDonationConfigValid(config)) {
    throw new Error(DONATION_CONFIG_ERROR);
  }

  return {
    ...config,
    warning: stringFrom(response.warning || config.warning),
  };
}

export function isDonationConfigValid(config: DonationConfig | null | undefined): config is DonationConfig {
  return Boolean(
    config &&
      config.banco &&
      config.tipoCuenta &&
      config.numeroCuenta &&
      config.titular &&
      config.correoContacto,
  );
}

export function getDonationConfigErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return DONATION_CONFIG_ERROR;
}

function normalizeDonationConfig(value: unknown): DonationConfig {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    id: stringFrom(record.id),
    banco: stringFrom(record.banco),
    tipoCuenta: stringFrom(record.tipoCuenta || record.tipo_cuenta),
    numeroCuenta: stringFrom(record.numeroCuenta || record.numero_cuenta),
    titular: stringFrom(record.titular || record.nombreTitular || record.nombre_titular),
    nit: stringFrom(record.nit || record.Nit || record.NIT),
    qrUrl: stringFrom(record.qrUrl || record.qr_url),
    correoContacto: stringFrom(record.correoContacto || record.correo_contacto || record.emailContacto),
    updatedAt: stringFrom(record.updatedAt || record.updated_at),
    warning: stringFrom(record.warning),
  };
}

function stringFrom(value: unknown) {
  return String(value || '').trim();
}
