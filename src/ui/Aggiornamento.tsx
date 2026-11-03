// Aggiornamento della PWA: controlla una versione nuova ogni ora e ogni volta che l'app torna
// in primo piano; quando c'è, mostra un bottone "Aggiorna" (il service worker nuovo si attiva
// e la pagina si ricarica da sola, senza svuotare la cache a mano).
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

const OGNI_MS = 60 * 60 * 1000;

export function useAggiornamento() {
  const [pronto, setPronto] = useState(false);
  const [aggiorna, setAggiorna] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let registrazione: ServiceWorkerRegistration | undefined;
    const controlla = () => registrazione?.update().catch(() => {});
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setPronto(true);
      },
      onRegisteredSW(_url, r) {
        registrazione = r;
        controlla();
      },
    });
    setAggiorna(() => () => update(true));
    const t = window.setInterval(controlla, OGNI_MS);
    const suVisibilita = () => {
      if (document.visibilityState === 'visible') controlla();
    };
    document.addEventListener('visibilitychange', suVisibilita);
    window.addEventListener('online', controlla);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', suVisibilita);
      window.removeEventListener('online', controlla);
    };
  }, []);

  return { pronto, aggiorna };
}

export function BannerAggiornamento() {
  const { pronto, aggiorna } = useAggiornamento();
  const [inCorso, setInCorso] = useState(false);
  if (!pronto || !aggiorna) return null;
  return (
    <div className="aggiornamento" role="status" data-testid="aggiornamento">
      <span className="aggiornamento-testo">C'è una versione nuova del giardino.</span>
      <button
        type="button"
        className="bottone piccolo"
        data-testid="aggiorna"
        disabled={inCorso}
        onClick={() => {
          setInCorso(true);
          // ricarica quando il nuovo service worker prende il controllo; in ogni caso entro 4 s
          let fatto = false;
          const ricarica = () => {
            if (fatto) return;
            fatto = true;
            window.location.reload();
          };
          navigator.serviceWorker?.addEventListener('controllerchange', ricarica, { once: true });
          window.setTimeout(ricarica, 4000);
          aggiorna().catch(ricarica);
        }}
      >
        {inCorso ? 'Aggiorno…' : 'Aggiorna'}
      </button>
    </div>
  );
}
