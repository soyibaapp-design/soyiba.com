import { useEffect, useState, type ReactNode } from 'react';
import { LoaderCircle, X } from 'lucide-react';

type LegalDocumentId = 'data-policy' | 'terms' | 'privacy';

type LegalDocumentButtonProps = {
  documentId: LegalDocumentId;
  children: ReactNode;
  className?: string;
};

const legalDocuments: Record<LegalDocumentId, { title: string; href: string }> = {
  'data-policy': {
    title: 'Política de Tratamiento de Datos',
    href: 'politica-tratamiento-datos.html',
  },
  terms: {
    title: 'Términos de Uso',
    href: 'terminos-uso.html',
  },
  privacy: {
    title: 'Política de Privacidad',
    href: 'politica-privacidad.html',
  },
};

export function LegalDocumentButton({ documentId, children, className = '' }: LegalDocumentButtonProps) {
  const [open, setOpen] = useState(false);
  const document = legalDocuments[documentId];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`border-0 bg-transparent p-0 text-left cursor-pointer ${className}`}
      >
        {children}
      </button>
      {open ? <LegalDocumentModal document={document} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function LegalDocumentModal({ document, onClose }: { document: { title: string; href: string }; onClose: () => void }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setHtml('');
    setError('');

    fetch(document.href)
      .then((response) => {
        if (!response.ok) {
          throw new Error('No fue posible cargar el documento.');
        }

        return response.text();
      })
      .then((source) => {
        if (cancelled) {
          return;
        }

        const parsed = new DOMParser().parseFromString(source, 'text/html');
        const article = parsed.querySelector('article');
        setHtml(article?.innerHTML || parsed.body.innerHTML || '');
      })
      .catch(() => {
        if (!cancelled) {
          setError('No fue posible cargar el documento legal. Intenta de nuevo.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [document.href]);

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-[#061c4a]/75 px-3 py-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-document-title"
    >
      <section className="flex max-h-[88svh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl shadow-slate-950/30">
        <header className="flex items-start justify-between gap-4 border-b border-[#DCE6F5] px-4 py-3 sm:px-5">
          <h2 id="legal-document-title" className="min-w-0 text-base font-black leading-5 text-[#0B1F5B] sm:text-lg">
            {document.title}
          </h2>
          <button
            type="button"
            aria-label="Cerrar documento"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#637295] transition hover:bg-[#F1F6FF] hover:text-[#0B1F5B]"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {!html && !error ? (
            <div className="flex h-44 items-center justify-center text-[#145CFF]">
              <LoaderCircle size={24} className="animate-spin" aria-hidden="true" />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-[14px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">{error}</p>
          ) : null}

          {html ? <div className="legal-document-content" dangerouslySetInnerHTML={{ __html: html }} /> : null}
        </div>

        <footer className="border-t border-[#DCE6F5] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-[#062b70] text-sm font-bold text-white transition hover:bg-[#041f55]"
          >
            Entendido
          </button>
        </footer>
      </section>
    </div>
  );
}
