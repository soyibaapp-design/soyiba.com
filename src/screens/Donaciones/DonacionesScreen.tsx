import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Headphones,
  HeartHandshake,
  LoaderCircle,
  Mail,
  MessageCircle,
  QrCode,
  ReceiptText,
  RefreshCw,
  X,
  type LucideIcon,
} from 'lucide-react';
import { primaryAssets } from '../../lib/assets';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';
import {
  getDonationConfig,
  getDonationConfigErrorMessage,
  isDonationConfigValid,
  type DonationConfig,
} from './donaciones.service';

type DonacionesScreenProps = {
  session: SoyibaSession;
};

type DonationStatus = 'loading' | 'success' | 'error';
type CopyState = 'idle' | 'success' | 'error';

const WHATSAPP_ACCOUNTING_PHONE = '573243339375';
const DONATION_TRANSFER_KEY = '0091775996';
const ACCOUNTING_MAIL_SUBJECT = 'Consulta sobre donaciones - SOY IBA';
const DONATION_ERROR =
  'No fue posible cargar la información de donación. Por favor intenta más tarde o comunícate con contabilidad.';
const TAX_CERTIFICATE_MESSAGE =
  'Hola, Dios les bendiga. Quisiera solicitar información sobre el certificado o soporte de donaciones realizadas a la Iglesia Bíblica Antioquía para efectos de declaración de renta. Mi nombre es: Cédula/NIT: Año a consultar:';

const receiptRequirements = [
  'Captura o comprobante de la transferencia.',
  'Nombre completo para identificar tu aporte.',
  'Mensaje enviado al WhatsApp oficial de contabilidad.',
];

const faqItems = [
  {
    question: '¿Cómo se administran las donaciones?',
    answer:
      'Las donaciones son gestionadas por la administración de la iglesia siguiendo procedimientos internos orientados al manejo responsable y transparente de los recursos.',
  },
  {
    question: '¿Puedo solicitar información sobre mi donación?',
    answer:
      'Sí. Puedes comunicarte con el área de contabilidad para resolver inquietudes relacionadas con transferencias, comprobantes o registros.',
  },
  {
    question: '¿Debo enviar comprobante?',
    answer: 'Sí. Esto nos ayuda a identificar correctamente tu aporte y mantener nuestros registros actualizados.',
  },
  {
    question: '¿Las donaciones son obligatorias?',
    answer:
      'No. Los diezmos y ofrendas son actos voluntarios realizados como expresión de gratitud, adoración y obediencia a Dios.',
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function getTouchDistance(touches: React.TouchList) {
  const first = touches[0];
  const second = touches[1];

  if (!first || !second) {
    return 0;
  }

  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export function DonacionesScreen({ session }: DonacionesScreenProps) {
  const [status, setStatus] = useState<DonationStatus>('loading');
  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [accountCopyState, setAccountCopyState] = useState<CopyState>('idle');
  const [keyCopyState, setKeyCopyState] = useState<CopyState>('idle');
  const [qrOpen, setQrOpen] = useState(false);
  const [qrZoom, setQrZoom] = useState(1);
  const [qrFailed, setQrFailed] = useState(false);
  const pinchRef = useRef({ distance: 0, zoom: 1 });
  const displayName = getDisplayName(session.user);
  const visibleAccountNumber = config?.numeroCuenta || '';
  const qrImageUrl = useMemo(() => resolveAssetUrl(config?.qrUrl), [config?.qrUrl]);
  const holderName = config?.titular || '';
  const accountTitle = [config?.tipoCuenta, config?.banco].filter(Boolean).join(' ');
  const contactEmail = config?.correoContacto || '';
  const mailtoUrl = buildMailtoUrl(contactEmail, ACCOUNTING_MAIL_SUBJECT);
  const contactWhatsappUrl = buildWhatsappUrl(
    WHATSAPP_ACCOUNTING_PHONE,
    'Hola, tengo una pregunta sobre mis donaciones a la Iglesia Bíblica Antioquía.',
  );
  const receiptWhatsappUrl = buildWhatsappUrl(
    WHATSAPP_ACCOUNTING_PHONE,
    `Bendiciones Soy ${displayName}. adjunto el comprobante`,
  );
  const taxCertificateWhatsappUrl = buildWhatsappUrl(WHATSAPP_ACCOUNTING_PHONE, TAX_CERTIFICATE_MESSAGE);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');
    setError('');
    setAccountCopyState('idle');
    setKeyCopyState('idle');
    setQrFailed(false);

    getDonationConfig()
      .then((nextConfig) => {
        if (!isMounted) {
          return;
        }

        setConfig(nextConfig);
        setStatus('success');

        if (nextConfig.warning) {
          console.warn(nextConfig.warning);
        }
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setConfig(null);
        setError(getDonationConfigErrorMessage(loadError));
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (accountCopyState === 'idle') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setAccountCopyState('idle'), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [accountCopyState]);

  useEffect(() => {
    if (keyCopyState === 'idle') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setKeyCopyState('idle'), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [keyCopyState]);

  useEffect(() => {
    if (!qrOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeQr();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [qrOpen]);

  async function handleCopyAccount() {
    if (!isDonationConfigValid(config) || config.numeroCuenta !== visibleAccountNumber) {
      setAccountCopyState('error');
      return;
    }

    try {
      await copyText(visibleAccountNumber);
      setAccountCopyState('success');
    } catch {
      setAccountCopyState('error');
    }
  }

  async function handleCopyKey() {
    try {
      await copyText(DONATION_TRANSFER_KEY);
      setKeyCopyState('success');
    } catch {
      setKeyCopyState('error');
    }
  }

  function closeQr() {
    setQrOpen(false);
    setQrZoom(1);
    pinchRef.current = { distance: 0, zoom: 1 };
  }

  function handleQrTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) {
      return;
    }

    pinchRef.current = {
      distance: getTouchDistance(event.touches),
      zoom: qrZoom,
    };
  }

  function handleQrTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !pinchRef.current.distance) {
      return;
    }

    event.preventDefault();
    const nextDistance = getTouchDistance(event.touches);
    const ratio = nextDistance / pinchRef.current.distance;
    setQrZoom(clamp(pinchRef.current.zoom * ratio, 1, 3));
  }

  if (status === 'loading') {
    return <DonacionesLoading />;
  }

  if (status === 'error' || !isDonationConfigValid(config)) {
    return (
      <motion.section
        key="donaciones-error"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        className="space-y-5 pb-4"
      >
        <DonacionesIntro />
        <section className="rounded-[24px] border border-rose-100 bg-white/95 p-5 text-center shadow-[0_18px_45px_rgba(7,24,74,0.09)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle size={28} />
          </div>
          <h2 className="mt-4 text-lg font-black text-[#07184A]">Información no disponible</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#637094]">{error || DONATION_ERROR}</p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#1438DC] px-5 text-sm font-black text-white shadow-[0_18px_45px_rgba(20,56,220,0.18)]"
          >
            <RefreshCw size={17} />
            Reintentar
          </button>
        </section>
      </motion.section>
    );
  }

  return (
    <motion.main
      key="donaciones"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="space-y-6 pb-4"
    >
      <DonacionesIntro />

      <section className="rounded-[24px] border border-[#07184A]/10 bg-white/95 p-5 shadow-[0_18px_45px_rgba(7,24,74,0.09)]">
        <div className="flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#07184A] text-white">
            <Building2 size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase text-[#1438DC]">Cuenta bancaria</p>
            <h2 className="text-xl font-black leading-tight text-[#07184A]">{accountTitle}</h2>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 rounded-[20px] bg-[#E9EFFF]/70 p-4 text-sm">
          <DonationDefinition label="Titular" value={holderName} />
          {config.nit ? <DonationDefinition label="NIT" value={config.nit} /> : null}
          <DonationDefinition label="Banco" value={config.banco} />
        </dl>

        <div className="mt-5 grid gap-3 min-[560px]:grid-cols-2">
          <div className="rounded-[20px] bg-[#07184A] px-4 py-4 text-white shadow-[0_18px_45px_rgba(7,24,74,0.18)]">
            <p className="text-xs font-black uppercase text-white/65">Número de cuenta</p>
            <p className="mt-1 break-words font-mono text-3xl font-black leading-tight sm:text-4xl">{visibleAccountNumber}</p>
          </div>

          <div className="rounded-[20px] bg-[#0F2A7A] px-4 py-4 text-white shadow-[0_18px_45px_rgba(15,42,122,0.18)]">
            <p className="text-xs font-black uppercase text-white/65">Llave</p>
            <p className="mt-1 break-words font-mono text-3xl font-black leading-tight sm:text-4xl">{DONATION_TRANSFER_KEY}</p>
          </div>
        </div>

        <p className="mt-3 rounded-2xl bg-[#E9EFFF]/70 px-3 py-3 text-xs font-black leading-snug text-[#637094]">
          Verifica siempre que el número de cuenta coincida con la información oficial de la Iglesia Bíblica Antioquía.
        </p>

        <div className="mt-3 grid gap-2 min-[560px]:grid-cols-2">
          <button
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1438DC] px-4 text-sm font-black text-white transition hover:bg-[#07184A] focus:outline-none focus:ring-4 focus:ring-[#1438DC]/25"
            type="button"
            onClick={handleCopyAccount}
          >
            <Copy size={17} />
            Copiar número de cuenta
          </button>
          <button
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#07184A] px-4 text-sm font-black text-white transition hover:bg-[#0F2A7A] focus:outline-none focus:ring-4 focus:ring-[#07184A]/20"
            type="button"
            onClick={handleCopyKey}
          >
            <Copy size={17} />
            Copiar llave
          </button>
        </div>

        <AnimatePresence>
          {accountCopyState !== 'idle' ? (
            <CopyFeedback
              key="account-copy-feedback"
              state={accountCopyState}
              successMessage="Número de cuenta copiado correctamente."
              errorMessage="No fue posible copiar el número de cuenta."
            />
          ) : null}
          {keyCopyState !== 'idle' ? (
            <CopyFeedback
              key="key-copy-feedback"
              state={keyCopyState}
              successMessage="Llave copiada correctamente."
              errorMessage="No fue posible copiar la llave."
            />
          ) : null}
        </AnimatePresence>

        {config.updatedAt ? <p className="mt-4 text-center text-xs font-black text-[#8A96B2]">Actualizado: {formatDate(config.updatedAt)}</p> : null}
      </section>

      <section className="space-y-4">
        <SectionHeading icon={QrCode} title="Dona desde cualquier banco o billetera digital" />
        <p className="text-sm font-semibold leading-relaxed text-[#637094]">
          Escanea este código QR desde la aplicación de tu banco o billetera digital para realizar tu donación de forma
          rápida y segura.
        </p>

        <button
          className="mx-auto block w-full max-w-[320px] rounded-[24px] border border-[#07184A]/10 bg-white/95 p-3 shadow-[0_18px_45px_rgba(7,24,74,0.09)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[#1438DC]/20"
          type="button"
          onClick={() => {
            if (qrImageUrl && !qrFailed) {
              setQrOpen(true);
            }
          }}
          aria-label="Ampliar código QR de donaciones"
        >
          {qrImageUrl && !qrFailed ? (
            <img
              className="w-full rounded-[18px] bg-white object-contain"
              src={qrImageUrl}
              alt="QR oficial de donaciones"
              onError={() => setQrFailed(true)}
            />
          ) : (
            <span className="grid aspect-square place-items-center rounded-[18px] bg-[#E9EFFF]/70 p-5 text-center">
              <span>
                <QrCode className="mx-auto text-[#8A96B2]" size={44} />
                <span className="mt-3 block text-sm font-black text-[#07184A]">QR no disponible en este momento.</span>
              </span>
            </span>
          )}
        </button>

        <p className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-black leading-snug text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Compatible con Bancolombia, Nequi, Daviplata y otras entidades financieras habilitadas.
        </p>
      </section>

      <InfoCard icon={ReceiptText} title="Confirma tu donación">
        <p className="text-sm font-semibold leading-relaxed text-[#637094]">
          Después de realizar tu transferencia puedes enviarnos:
        </p>
        <ul className="mt-4 space-y-2">
          {receiptRequirements.map((requirement) => (
            <li key={requirement} className="flex items-start gap-2 text-sm font-bold text-[#07184A]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{requirement}</span>
            </li>
          ))}
        </ul>
        <a
          className="mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
          href={receiptWhatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={17} />
          Enviar comprobante por WhatsApp
        </a>
      </InfoCard>

      <InfoCard icon={FileText} title="Declaración de renta">
        <p className="text-sm font-semibold leading-relaxed text-[#637094]">
          Si realizaste donaciones a la iglesia y necesitas solicitar el certificado o soporte correspondiente para tu
          declaración de renta, puedes comunicarte con el equipo encargado.
        </p>
        <a
          className="mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
          href={taxCertificateWhatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={17} />
          Solicitar certificado
        </a>
      </InfoCard>

      <article className="flex items-start gap-3 rounded-[24px] bg-[#07184A] p-5 text-white shadow-[0_18px_45px_rgba(7,24,74,0.18)]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-white">
          <HeartHandshake size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black leading-tight">Transparencia y Administración de Recursos</h2>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
            En la Iglesia Bíblica Antioquía entendemos que cada donación representa un acto de confianza, generosidad y
            compromiso con la obra de Dios. Por esta razón, promovemos el manejo responsable, transparente y diligente de
            los recursos recibidos, orientándolos al cumplimiento de nuestra misión espiritual, comunitaria y
            evangelística.
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
            Estos recursos son destinados a apoyar la misión de la iglesia, el discipulado, la evangelización, los
            eventos ministeriales y las necesidades operativas que permiten servir a nuestra comunidad, garantizando el
            funcionamiento continuo de la iglesia y la proclamación del Evangelio.
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
            Por lo anterior, se hace una rendición de cuentas anual a la asamblea de miembros.
          </p>
        </div>
      </article>

      <InfoCard icon={Headphones} title="¿Tienes preguntas sobre tus donaciones?">
        <p className="text-sm font-semibold leading-relaxed text-[#637094]">
          Nuestro equipo está disponible para ayudarte con inquietudes relacionadas con diezmos, ofrendas, comprobantes
          o información administrativa.
        </p>

        <div className="mt-4 grid gap-2 text-sm font-black text-[#07184A] min-[560px]:grid-cols-2">
          <p className="rounded-2xl bg-[#E9EFFF]/70 px-3 py-3">
            <span className="block text-xs uppercase text-[#637094]">Correo</span>
            <span className="break-all">{contactEmail}</span>
          </p>
          <p className="rounded-2xl bg-[#E9EFFF]/70 px-3 py-3">
            <span className="block text-xs uppercase text-[#637094]">WhatsApp</span>
            324 333 9375
          </p>
        </div>

        <div className="mt-4 grid gap-2 min-[560px]:grid-cols-2">
          <a
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#07184A] px-4 text-sm font-black text-white transition hover:bg-[#0A1645]"
            href={mailtoUrl}
          >
            <Mail size={17} />
            Contactar por correo
          </a>
          <a
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
            href={contactWhatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} />
            Contactar por WhatsApp
          </a>
        </div>
      </InfoCard>

      <section className="space-y-3">
        <h2 className="text-xl font-black text-[#07184A]">Preguntas frecuentes</h2>
        {faqItems.map((item) => (
          <details key={item.question} className="group rounded-[20px] border border-[#07184A]/10 bg-white/95 p-4 shadow-[0_18px_45px_rgba(7,24,74,0.09)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-black text-[#07184A] [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-[#1438DC] transition group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#637094]">{item.answer}</p>
          </details>
        ))}
      </section>

      {qrOpen ? (
        <QrDialog
          imageUrl={qrImageUrl}
          zoom={qrZoom}
          onClose={closeQr}
          onTouchStart={handleQrTouchStart}
          onTouchMove={handleQrTouchMove}
        />
      ) : null}
    </motion.main>
  );
}

function DonacionesIntro() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-black text-[#07184A]">Donaciones</h1>
        <p className="mt-2 max-w-md text-base font-semibold leading-snug text-[#637094]">
          Tu generosidad hace posible que el Evangelio siga transformando vidas.
        </p>
      </div>

      <figure className="overflow-hidden rounded-[24px] shadow-[0_18px_45px_rgba(7,24,74,0.10)]">
        <img
          className="w-full object-cover"
          src={primaryAssets.donationVerse}
          alt="2 Corintios 9:7. Dios ama al dador alegre."
        />
      </figure>
    </section>
  );
}

function DonacionesLoading() {
  return (
    <motion.section
      key="donaciones-loading"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="space-y-5 pb-4"
    >
      <DonacionesIntro />
      <section className="rounded-[24px] border border-[#07184A]/10 bg-white/95 p-5 shadow-[0_18px_45px_rgba(7,24,74,0.09)]">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#E9EFFF] text-[#1438DC]">
            <LoaderCircle size={24} className="animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#07184A]">Cargando información</h2>
            <p className="mt-1 text-sm font-semibold text-[#637094]">Validando la configuración oficial.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-[20px] bg-[#E9EFFF]/80" />
          ))}
        </div>
      </section>
    </motion.section>
  );
}

function DonationDefinition({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black text-[#637094]">{label}</dt>
      <dd className="break-words font-black text-[#07184A]">{value}</dd>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#E9EFFF] text-[#1438DC]">
        <Icon size={22} />
      </span>
      <h2 className="min-w-0 text-xl font-black leading-tight text-[#07184A]">{title}</h2>
    </div>
  );
}

function CopyFeedback({ state, successMessage, errorMessage }: { state: CopyState; successMessage: string; errorMessage: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`mt-4 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black ${
        state === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {state === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      {state === 'success' ? successMessage : errorMessage}
    </motion.p>
  );
}

function InfoCard({ icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <article className="rounded-[24px] border border-[#07184A]/10 bg-white/95 p-5 shadow-[0_18px_45px_rgba(7,24,74,0.09)]">
      <SectionHeading icon={icon} title={title} />
      <div className="mt-4">{children}</div>
    </article>
  );
}

function QrDialog({
  imageUrl,
  zoom,
  onClose,
  onTouchStart,
  onTouchMove,
}: {
  imageUrl: string;
  zoom: number;
  onClose: () => void;
  onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 text-white" role="dialog" aria-modal="true" aria-label="QR de donaciones">
      <button
        className="absolute right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
        type="button"
        onClick={onClose}
        aria-label="Cerrar código QR"
      >
        <X size={24} />
      </button>

      <div className="h-full w-full overflow-auto" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
        <div className="flex min-h-full min-w-full items-center justify-center p-4">
          <img
            className="block max-w-none rounded-[20px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-[width]"
            src={imageUrl}
            alt="QR oficial de donaciones ampliado"
            style={{ width: `${zoom * 85}vmin` }}
          />
        </div>
      </div>
    </div>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function resolveAssetUrl(value: string | undefined) {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return '';
  }

  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/?$/, '/')}${trimmed.replace(/^\/+/, '')}`;
}

function buildWhatsappUrl(phone: string, message: string) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) {
    return '#';
  }

  const number = digits.startsWith('57') ? digits : `57${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}

function buildMailtoUrl(email: string, subject: string) {
  if (!email) {
    return '#';
  }

  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getDisplayName(user: SoyibaUser) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario SOY IBA';
}
