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
  const banco = stringFrom(record.banco);
  const tipoCuenta = stringFrom(record.tipoCuenta || record.tipo_cuenta);
  const numeroCuenta = normalizeAccountNumber(record.numeroCuenta || record.numero_cuenta, banco, tipoCuenta);

  return {
    id: stringFrom(record.id),
    banco,
    tipoCuenta,
    numeroCuenta,
    titular: stringFrom(record.titular || record.nombreTitular || record.nombre_titular),
    nit: stringFrom(record.nit || record.Nit || record.NIT),
    qrUrl: normalizeQrUrl(record.qrUrl || record.qr_url),
    correoContacto: stringFrom(record.correoContacto || record.correo_contacto || record.emailContacto),
    updatedAt: stringFrom(record.updatedAt || record.updated_at),
    warning: stringFrom(record.warning),
  };
}

function normalizeAccountNumber(value: unknown, banco: string, tipoCuenta: string) {
  const text = stringFrom(value);
  const digits = text.replace(/\D/g, '');
  const bank = normalizeText(banco);
  const type = normalizeText(tipoCuenta);
  const shouldRestoreLeadingZero = bank.includes('bancolombia') && type.includes('ahorro') && digits.length === 10;
  const normalizedDigits = shouldRestoreLeadingZero ? `0${digits}` : digits;

  if (normalizedDigits.length === 11) {
    return normalizedDigits.replace(/^(\d{3})(\d{6})(\d{2})$/, '$1-$2-$3');
  }

  return text;
}

function normalizeQrUrl(value: unknown) {
  const text = stringFrom(value).replace(/\\/g, '/');

  if (/^(primaryassets|public\/assets)\/qriba\.jpg$/i.test(text) || /^qriba\.jpg$/i.test(text)) {
    return 'assets/qriba.jpg';
  }

  return text;
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function stringFrom(value: unknown) {
  return String(value || '').trim();
}
