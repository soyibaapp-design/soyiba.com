import { motion } from 'framer-motion';
import type { SoyibaSession } from '../Auth/auth.service';
import { PublicationsFeed } from '../Publicaciones/PublicationsFeed';

type InicioScreenProps = {
  session: SoyibaSession;
  openPublicationComposerSignal?: number;
  onPublicationComposerOpenChange?: (open: boolean) => void;
  onOpenEvent?: (publicationId: string) => void;
  onOpenEventsScreen?: () => void;
  onOpenEco?: (publicationId: string) => void;
  openPublicationId?: string;
  onPublicationOpened?: () => void;
  publicMode?: boolean;
  onAuthRequired?: (mode: 'login' | 'register') => void;
  showLiveBadge?: boolean;
};

export function InicioScreen({
  session,
  openPublicationComposerSignal = 0,
  onPublicationComposerOpenChange,
  onOpenEvent,
  onOpenEventsScreen,
  onOpenEco,
  openPublicationId,
  onPublicationOpened,
  publicMode = false,
  onAuthRequired,
  showLiveBadge = false,
}: InicioScreenProps) {
  return (
    <motion.section
      key="inicio"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="space-y-5"
    >
      <PublicationsFeed
        session={session}
        openComposerSignal={openPublicationComposerSignal}
        onComposerOpenChange={onPublicationComposerOpenChange}
        onOpenEventFromHome={onOpenEvent}
        onOpenEventsFromHome={onOpenEventsScreen}
        onOpenEcoFromHome={onOpenEco}
        openPublicationId={openPublicationId}
        onPublicationOpened={onPublicationOpened}
        publicMode={publicMode}
        onAuthRequired={onAuthRequired}
        showLiveBadge={showLiveBadge}
      />
    </motion.section>
  );
}
