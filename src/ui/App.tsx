// Regia dell'app: archivio, due stanze di rete, partita, mascotte, schermate.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CARATTERE, FRASI } from '../config/frasi';
import type { ChiParla } from '../config/frasi';
import { dormePerOrario } from '../config/sonno';
import { COLORI_RUOLO, PROFILI, nomeVisibile, profiloDiNome } from '../config/giocatori';
import type { Livello, Modalita } from '../engine';
import type { Messaggio } from '../net';
import type { VoceStorico } from '../stato';
import type { Archivio } from '../stato/archivio';
import { unisciStoricoRemoto } from '../stato/archivio';
import { Giardino } from './Giardino';
import type { Arrivo, Lampo } from './Griglia';
import { Home } from './Home';
import type { Chiacchiera } from './Home';
import { Ingresso } from './Ingresso';
import { cancellaPartita, esporta, importa, ioDaArchivio, nomeFileEsportazione, profiloConfermato, ricomincia } from './memoria';
import type { Tema } from './MenuHome';
import { Partita } from './Partita';
import {
  CHIAVE_SBLOCCO,
  SOLLETICO_OGNI_MS,
  accessorioDi,
  bonusVittoria,
  chiacchiera,
  daRimandare,
  fioriDi,
  fraseMascotte,
  fraseSonno,
  mascotteDi,
  presenzaBlu,
  scegliFrase,
  scenaDaMostrare,
  seminaSbloccata,
  solletico,
  sostituisci,
  tappaDaMostrare,
  umoreEvento,
  vociCambiate,
} from './regole';
import type { CategoriaFrase, Tappa } from './regole';
import { ScenaSblocco } from './ScenaSblocco';
import { Toasts, useToasts } from './Toasts';
import { useArchivio } from './useArchivio';
import { useMascotte, useOgniTanto } from './useMascotte';
import { usePartita } from './usePartita';
import type { Reazione } from './usePartita';
import { useRete } from './useRete';
import type { Destinazione, Origine } from './useRete';
import type { Io } from './useStanza';
import { CHIAVI, altro, leggi, scrivi } from './util';
import { Vittoria } from './Vittoria';

type Schermata = 'ingresso' | 'home' | 'partita' | 'giardino';

const CATEGORIE = new Set<string>([...Object.keys(FRASI), 'chiacchiera', 'solletico']);
/** reazioni del partner che meritano anche il suo banner "hai visto?" e il lampo sulla cella */
const DA_APPLAUSO = new Set(['brillante', 'intelligente', 'serie', 'regalo']);
const SILENZIO_PARTITA_MS = 45000;
const RISPETTA_CHIACCHIERA_MS = 30000;
const DURATA_CHIACCHIERA_MS = 6500;
const DURATA_SOLLETICO_MS = 2600;
const STORICO_OGNI_MS = 2000;

function leggiTema(): Tema {
  const t = leggi<string>(CHIAVI.tema);
  return t === 'scuro' || t === 'chiaro' ? t : 'auto';
}

export function App() {
  const { archivio, ref, modifica } = useArchivio();
  const io = useMemo(() => ioDaArchivio(archivio), [archivio]);
  const profilo = profiloDiNome(io?.nome ?? '');
  const profiloPartner = PROFILI.find((p) => p.id !== profilo.id) ?? PROFILI[1];
  const mioRuolo = profilo.ruolo;
  const fiori = fioriDi(archivio.storico);
  // Semina "esiste" su questo dispositivo solo dopo la sua scena: prima la vittoria che la sblocca
  // (o lo storico del partner) non deve rivelarla (Vittoria, cruscotto, nomi, voce).
  const sbloccata = seminaSbloccata(fiori) && archivio.tappeViste.includes(CHIAVE_SBLOCCO);
  const nomeMio = nomeVisibile(profilo, sbloccata);
  const nomePartner = nomeVisibile(profiloPartner, sbloccata);
  const { mostraErrori, vibrazione } = archivio.impostazioni;
  const partita = archivio.partita;

  // Nome libero di T1 (non "Semino"/"Semina"): l'Ingresso chiede una volta di confermare il colore,
  // già preselezionato da profiloDiNome; un nome non riconosciuto diventerebbe Blu in silenzio.
  const [schermata, setSchermata] = useState<Schermata>(() =>
    !io || !profiloConfermato(archivio) ? 'ingresso' : archivio.partita && !archivio.partita.finita ? 'partita' : 'home',
  );
  const [tema, setTema] = useState<Tema>(leggiTema);
  const [partnerCursore, setPartnerCursore] = useState<number | null>(null);
  const [lampo, setLampo] = useState<Lampo | null>(null);
  const [arrivo, setArrivo] = useState<Arrivo | null>(null);
  const [generando, setGenerando] = useState(false);
  const [vittoriaChiusa, setVittoriaChiusa] = useState<number | null>(null);
  const [fraseVittoria, setFraseVittoria] = useState<{ iniziata: number; testo: string } | null>(null);
  const [chiacchieraOra, setChiacchieraOra] = useState<Chiacchiera | null>(null);
  const [tappaHome, setTappaHome] = useState<Tappa | null>(null);
  const [solleticoOra, setSolleticoOra] = useState<Chiacchiera | null>(null);
  const { attivi, mostra } = useToasts();
  const { mascotte, reagisci, sveglia } = useMascotte();

  // valori letti dai gestori di rete (sempre gli ultimi)
  const vivi = useRef({ nomeMio, nomePartner, sbloccata, mioRuolo, schermata, mostraErrori, vibrazione, mascotte });
  useEffect(() => {
    vivi.current = { nomeMio, nomePartner, sbloccata, mioRuolo, schermata, mostraErrori, vibrazione, mascotte };
  });
  const ultimaFrase = useRef('');
  const ultimoEvento = useRef(0);
  const ultimaChiacchieraRicevuta = useRef(0);
  const ultimoArrivo = useRef(0);
  const prossimaChi = useRef<ChiParla>('semino');
  const inviate = useRef(new Map<string, number>());
  const timerChiacchiera = useRef(0);
  const timerSolletico = useRef(0);
  const ultimoSolletico = useRef({ ts: 0, umore: '', testo: '' });
  // invio verso le stanze: la rete si apre più sotto (ha bisogno dei gestori), qui un rimando stabile
  const inviaRef = useRef<(m: Messaggio, dove?: Destinazione) => void>(() => {});
  const invia = useCallback((m: Messaggio, dove?: Destinazione) => inviaRef.current(m, dove), []);

  // --- tema --------------------------------------------------------------------
  useEffect(() => {
    const r = document.documentElement;
    if (tema === 'auto') delete r.dataset.tema;
    else r.dataset.tema = tema;
  }, [tema]);
  // quanto blu negli accenti di coppia: sul root, così arriva anche alla grana del body
  const blu = presenzaBlu(fiori, sbloccata);
  useEffect(() => {
    document.documentElement.style.setProperty('--blu-presenza', String(blu));
  }, [blu]);
  function cambiaTema(t: Tema) {
    setTema(t);
    scrivi(CHIAVI.tema, t === 'auto' ? null : t);
  }

  // --- frasi -------------------------------------------------------------------
  const sost = (n?: number) => ({
    nome: vivi.current.nomePartner,
    io: vivi.current.nomeMio,
    n,
    reale: profilo.nomeReale,
    realePartner: profiloPartner.nomeReale,
  });
  const frase = (c: CategoriaFrase, chi: ChiParla, n?: number) => {
    // svegliata nelle sue ore di sonno: una volta su due parla del sonno
    const assonnata = dormePerOrario(chi) && Math.random() < 0.5;
    const t = assonnata ? fraseSonno(chi, ultimaFrase.current) : fraseMascotte(c, chi, ultimaFrase.current, sost(n));
    ultimaFrase.current = t;
    return t;
  };
  const fraseSemplice = (c: CategoriaFrase) => {
    const t = scegliFrase(FRASI[c], ultimaFrase.current, sost());
    ultimaFrase.current = t;
    return t;
  };

  // --- reazioni delle mascotte (generate qui o arrivate dall'altro: si mostrano uguali) ------
  function posizioneCella(idx: number) {
    const el = document.querySelector(`[data-testid="cella-${idx}"]`);
    const r = el?.getBoundingClientRect();
    const margine = Math.min(110, window.innerWidth / 2);
    return r
      ? { x: Math.min(Math.max(r.left + r.width / 2, margine), window.innerWidth - margine), y: r.top }
      : { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  }

  function mostraChiacchiera(chi: ChiParla, testo: string) {
    setChiacchieraOra({ id: Date.now(), chi, testo, accessorio: accessorioDi(chi, testo) });
    window.clearTimeout(timerChiacchiera.current);
    timerChiacchiera.current = window.setTimeout(() => setChiacchieraOra(null), DURATA_CHIACCHIERA_MS);
  }

  function mostraReazione(r: Reazione, dalPartner: boolean) {
    const v = vivi.current;
    // prima dello sblocco Semina non esiste: se un dispositivo indietro la nomina, si mostra Semino
    const chi: ChiParla = v.sbloccata ? r.chi : 'semino';
    if (r.categoria === 'solletico') {
      // prima che Semina arrivi qui, un suo solletico dall'altro dispositivo non si mostra
      if (chi !== r.chi) return;
      // anche quello arrivato dall'altro conta come "precedente": il prossimo sarà diverso
      ultimoSolletico.current = { ...ultimoSolletico.current, umore: r.umore, testo: r.testo };
      reagisci(chi, r.umore);
      setSolleticoOra({ id: Date.now(), chi, testo: r.testo });
      window.clearTimeout(timerSolletico.current);
      timerSolletico.current = window.setTimeout(() => setSolleticoOra(null), DURATA_SOLLETICO_MS);
      return;
    }
    reagisci(chi, r.umore, { attivita: r.categoria !== 'chiacchiera' });
    if (r.categoria === 'chiacchiera') {
      if (r.testo) mostraChiacchiera(chi, r.testo);
      return;
    }
    ultimoEvento.current = Date.now();
    if (r.categoria === 'vittoria') {
      const p = ref.current.partita;
      if (p && r.testo) setFraseVittoria({ iniziata: p.iniziata, testo: r.testo });
      return;
    }
    if (!r.testo) return;
    const delPartner = v.sbloccata && dalPartner && chi === mascotteDi(altro(v.mioRuolo));
    const prefisso = delPartner ? nomeVisibile(PROFILI.find((p) => p.id === chi) ?? PROFILI[0], true) : undefined;
    const errore = r.categoria === 'sbagliata' || r.categoria === 'sbagliataSerie';
    const colore = errore ? 'var(--errore)' : r.categoria === 'completato' ? 'var(--evid)' : dalPartner ? 'var(--suo-testo)' : 'var(--mio-testo)';
    if (r.idx !== undefined && v.schermata === 'partita') {
      mostra({ tipo: 'piccolo', testo: r.testo, prefisso, colore, categoria: r.categoria, ...posizioneCella(r.idx) });
    } else {
      mostra({ tipo: 'banner', testo: r.testo, prefisso, categoria: r.categoria });
    }
  }

  function inviaReazione(r: Reazione) {
    invia({ t: 'evento', tipo: `${r.chi}:${r.umore}:${r.categoria}`, idx: r.idx, testo: r.testo });
  }

  function ricevieEvento(m: Extract<Messaggio, { t: 'evento' }>, da: Origine) {
    const [chi, umore, categoria] = String(m.tipo ?? '').split(':');
    if ((chi !== 'semino' && chi !== 'semina') || !CATEGORIE.has(categoria)) return;
    const testo = typeof m.testo === 'string' ? m.testo.slice(0, 200) : '';
    const idx = typeof m.idx === 'number' && m.idx >= 0 && m.idx <= 80 ? m.idx : undefined;
    if (categoria === 'chiacchiera') ultimaChiacchieraRicevuta.current = Date.now();
    const delPartner = da === 'coppia' || !!m.inoltrato;
    mostraReazione({ chi, umore: umore || 'neutro', categoria: categoria as Reazione['categoria'], testo, idx }, delPartner);
    if (delPartner && DA_APPLAUSO.has(categoria)) {
      if (idx !== undefined) setArrivo({ id: Date.now(), idx, tipo: 'evento' });
      if (categoria === 'brillante' || categoria === 'intelligente') mostra({ tipo: 'banner', testo: fraseSemplice('partnerBrillante'), categoria: 'partnerBrillante' });
    }
  }

  /** tocco su una mascotte: reazione a caso, mai uguale alla precedente; dopo lo sblocco la vede anche l'altro */
  function onSolletico(chi: ChiParla) {
    const u = ultimoSolletico.current;
    const ora = Date.now();
    if (ora - u.ts < SOLLETICO_OGNI_MS) return;
    const v = vivi.current;
    if (!v.sbloccata && chi !== 'semino') return;
    const r = solletico(chi, u.umore, u.testo, sost());
    if (dormePerOrario(chi) && Math.random() < 0.5) r.testo = fraseSonno(chi, u.testo);
    ultimoSolletico.current = { ts: ora, umore: r.umore, testo: r.testo };
    const reazione: Reazione = { chi, umore: r.umore, categoria: 'solletico', testo: r.testo };
    mostraReazione(reazione, false);
    if (v.sbloccata) inviaReazione(reazione);
  }
  useEffect(() => () => window.clearTimeout(timerSolletico.current), []);

  // --- partita ------------------------------------------------------------------
  const gioco = usePartita({
    partita,
    ref,
    modifica,
    mioRuolo,
    sbloccata,
    mostraErrori,
    invia,
    frase,
    effetti: {
      reazione: (r) => {
        mostraReazione(r, false);
        inviaReazione(r);
      },
      lampo: (centro, celle) => setLampo({ id: Date.now(), centro, celle }),
      vibra: (schema) => {
        if (vivi.current.vibrazione) navigator.vibrate?.(schema);
      },
      vittoria: () => {
        const p = ref.current.partita;
        if (!p) return;
        setVittoriaChiusa(null);
        reagisci(vivi.current.sbloccata ? mascotteDi(vivi.current.mioRuolo) : 'semino', umoreEvento('semino', 'vittoria'));
        // la frase la sceglie chi ha messo l'ultima cella; se non arriva, la scelgo io
        window.setTimeout(() => {
          setFraseVittoria((f) =>
            f && f.iniziata === p.iniziata
              ? f
              : { iniziata: p.iniziata, testo: frase('vittoria', vivi.current.sbloccata ? mascotteDi(vivi.current.mioRuolo) : 'semino') },
          );
        }, 2500);
      },
    },
  });

  // --- storico in rete -------------------------------------------------------------
  function inviaStoricoCompleto(dove: Origine | 'entrambe') {
    const a = ref.current;
    for (const v of a.storico) inviate.current.set(v.id, v.aggiornata);
    invia({ t: 'storico', storico: a.storico, azzerato: a.azzerato || undefined }, dove);
  }

  function riceviStorico(lista: VoceStorico[] | undefined, azzerato: number | undefined, da: Origine) {
    if (!Array.isArray(lista) && azzerato === undefined) return;
    const remoti = Array.isArray(lista) ? lista : [];
    const dopo = modifica((a) => unisciStoricoRemoto(a, remoti, azzerato));
    const ricevuti = new Set(remoti.map((v) => v?.id));
    for (const v of dopo.storico) if (ricevuti.has(v.id)) inviate.current.set(v.id, v.aggiornata);
    const rimanda = daRimandare(dopo.storico, remoti);
    if (rimanda.length || dopo.azzerato > (azzerato ?? 0)) {
      invia({ t: 'storico', storico: rimanda, azzerato: dopo.azzerato || undefined }, da);
    }
  }

  // ogni cambio dello storico: le voci cambiate partono al massimo ogni 2 s, verso entrambe le stanze
  const timerStorico = useRef(0);
  const storico = archivio.storico;
  useEffect(() => {
    if (timerStorico.current) return;
    timerStorico.current = window.setTimeout(() => {
      timerStorico.current = 0;
      const a = ref.current;
      const diff = vociCambiate(a.storico, inviate.current);
      if (!diff.length) return;
      for (const v of diff) inviate.current.set(v.id, v.aggiornata);
      invia({ t: 'storico', storico: diff, azzerato: a.azzerato || undefined });
    }, STORICO_OGNI_MS);
  }, [storico, ref, invia]);
  useEffect(() => () => window.clearTimeout(timerStorico.current), []);

  // --- rete --------------------------------------------------------------------------
  // Inoltro fra le due stanze (coppia ↔ personale), così il mio secondo dispositivo, che non ha
  // posto nella stanza di coppia, gioca lo stesso. Messaggi di stato (cella, contatori, nuova,
  // stato): inoltrati SOLO se hanno cambiato la mia partita → idempotenti, nessun ciclo.
  // evento/cursore/frase: inoltrati una volta sola (segno `inoltrato`).
  function inoltra(m: Messaggio, da: Origine) {
    invia({ ...m, inoltrato: true }, da === 'coppia' ? 'personale' : 'coppia');
  }
  /** viene dal partner: diretto dalla stanza di coppia, o inoltrato da un mio dispositivo */
  const dalPartner = (m: Messaggio, da: Origine) => da === 'coppia' || !!m.inoltrato;

  function suMessaggio(m: Messaggio, da: Origine) {
    // in sviluppo: traccia dei messaggi ricevuti (lo script QA tre-dispositivi conta gli `storico`)
    if (import.meta.env.DEV) console.debug(`[rete] ${da} ${m.t}${m.inoltrato ? ' inoltrato' : ''}`);
    const prima = ref.current.partita;
    const cambiata = () => ref.current.partita !== prima && ref.current.partita !== null;
    switch (m.t) {
      case 'ciao': {
        const mioAltroDispositivo = profiloDiNome(m.nome ?? '').id === profilo.id;
        if (da === 'coppia' && !mioAltroDispositivo) arrivoPartner(m.nome);
        const unita = gioco.riceviStato(m.stato);
        if (unita) invia({ t: 'stato', stato: unita }, da);
        if (cambiata()) inoltra({ t: 'stato', stato: ref.current.partita! }, da);
        if (m.storico) riceviStorico(m.storico, m.azzerato, da);
        inviaStoricoCompleto(da);
        break;
      }
      case 'stato':
        gioco.riceviStato(m.stato);
        if (cambiata()) inoltra({ t: 'stato', stato: ref.current.partita! }, da);
        break;
      case 'storico':
        riceviStorico(m.storico, m.azzerato, da);
        break;
      case 'cella':
        if (gioco.riceviCella(m)) {
          sveglia();
          if (dalPartner(m, da)) setArrivo({ id: Date.now(), idx: m.idx, tipo: 'mossa' });
          inoltra(m, da);
        }
        break;
      case 'contatori':
        if (gioco.riceviContatori(m)) inoltra(m, da);
        break;
      case 'nuova': {
        const id = m.stato?.puzzle ? `${m.stato.puzzle.modalita}-${m.stato.puzzle.seed}` : '';
        const eraGermoglio = ref.current.storico.some((v) => v.id === id && !v.finita);
        const esito = gioco.riceviNuova(m.stato, da);
        if (cambiata()) inoltra(m, da);
        if (esito !== 'nuova') break;
        setPartnerCursore(null);
        setVittoriaChiusa(null);
        setSchermata((s) => (s === 'ingresso' ? s : 'partita'));
        if (dalPartner(m, da)) {
          mostra({
            tipo: 'banner',
            testo: eraGermoglio ? fraseSemplice('ripresa') : `${vivi.current.nomePartner} ha iniziato una nuova partita`,
            categoria: eraGermoglio ? 'ripresa' : undefined,
          });
        }
        break;
      }
      case 'cursore':
        if (!m.inoltrato) inoltra(m, da);
        if (dalPartner(m, da)) setPartnerCursore(m.idx);
        break;
      case 'frase':
        if (!m.inoltrato) inoltra(m, da);
        if (dalPartner(m, da)) mostra({ tipo: 'grande', testo: m.testo, firma: vivi.current.nomePartner, colore: 'var(--suo)' });
        break;
      case 'evento':
        if (!m.inoltrato) inoltra(m, da);
        ricevieEvento(m, da);
        break;
    }
  }

  function arrivoPartner(nome: string) {
    modifica((a) => (a.partner === nome ? a : { ...a, partner: nome }));
    if (Date.now() - ultimoArrivo.current < 15000) return;
    ultimoArrivo.current = Date.now();
    const v = vivi.current;
    reagisci(v.sbloccata ? mascotteDi(altro(v.mioRuolo)) : 'semino', umoreEvento('semino', 'arrivo'));
    mostra({ tipo: 'banner', testo: fraseSemplice('arrivo'), categoria: 'arrivo' });
  }

  const rete = useRete(io, { statoCorrente: () => ref.current.partita, messaggio: suMessaggio });
  const { connessione } = rete;
  useEffect(() => {
    inviaRef.current = rete.invia;
  }, [rete.invia]);

  // partner andato via: il suo cursore non deve restare acceso sulla griglia
  useEffect(() => {
    if (connessione !== 'connesso') setPartnerCursore(null);
  }, [connessione]);

  // partita chiusa (azzeramento arrivato dall'altro, o cancellata): si torna alla Home
  if (schermata === 'partita' && !partita) setSchermata('home');

  // --- timer ---------------------------------------------------------------------
  const inGioco = schermata === 'partita' && !!partita && !partita.finita;
  const tick = gioco.tick;
  useEffect(() => {
    if (!inGioco) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') tick();
    }, 1000);
    return () => window.clearInterval(t);
  }, [inGioco, tick]);

  // --- storia e scena di sblocco -----------------------------------------------------
  const vittoriaAperta = schermata === 'partita' && !!partita?.finita && vittoriaChiusa !== partita.iniziata;
  const scena = !!io && schermata !== 'ingresso' && !vittoriaAperta && scenaDaMostrare(fiori, archivio.tappeViste);

  // entrando nella Home: la tappa più alta non ancora vista (segnata subito come vista)
  const [homeVista, setHomeVista] = useState<string | null>(null);
  // con `azzerato`: dopo "ricomincia" la storia riparte anche se i fiori erano già 0
  const chiaveHome = schermata === 'home' && !scena ? `${fiori}-${archivio.azzerato}` : null;
  if (chiaveHome !== homeVista) {
    setHomeVista(chiaveHome);
    const t = chiaveHome ? tappaDaMostrare(fiori, archivio.tappeViste) : null;
    setTappaHome(
      t && {
        ...t,
        testo: sostituisci(t.testo, { nome: nomePartner, io: nomeMio, reale: profilo.nomeReale, realePartner: profiloPartner.nomeReale }),
      },
    );
  }
  useEffect(() => {
    if (!tappaHome) return;
    const k = tappaHome.chiave;
    modifica((a) => (a.tappeViste.includes(k) ? a : { ...a, tappeViste: [...a.tappeViste, k] }));
  }, [tappaHome, modifica]);

  function fineScena() {
    modifica((a) => (a.tappeViste.includes(CHIAVE_SBLOCCO) ? a : { ...a, tappeViste: [...a.tappeViste, CHIAVE_SBLOCCO] }));
    reagisci('semino', 'felice');
    reagisci('semina', 'euforico');
  }

  // --- chiacchiere: ogni 40–60 s, mai sopra la storia, in partita solo dopo 45 s di quiete ------
  useOgniTanto(!!io && (schermata === 'home' || schermata === 'partita'), () => {
    const ora = Date.now();
    if (tappaHome || scena || vittoriaAperta) return;
    if (vivi.current.schermata === 'partita' && ora - ultimoEvento.current < SILENZIO_PARTITA_MS) return;
    if (connessione === 'connesso' && ora - ultimaChiacchieraRicevuta.current < RISPETTA_CHIACCHIERA_MS) return;
    const chi: ChiParla = vivi.current.sbloccata ? prossimaChi.current : 'semino';
    prossimaChi.current = chi === 'semino' ? 'semina' : 'semino';
    // chi dorme non chiacchiera
    if (vivi.current.mascotte[chi].umore === 'dorme') return;
    const testo = chiacchiera(chi, ultimaFrase.current, sost());
    if (!testo) return;
    ultimaFrase.current = testo;
    const r: Reazione = { chi, umore: CARATTERE[chi].umoreBase, categoria: 'chiacchiera', testo };
    mostraReazione(r, false);
    inviaReazione(r);
  });

  // --- azioni ------------------------------------------------------------------------
  // verso entrambe: il mio altro dispositivo non le mostra (non sono del partner) ma le inoltra
  const onCursore = useCallback((idx: number | null) => invia({ t: 'cursore', idx }), [invia]);

  function mandaFrase() {
    if (connessione !== 'connesso' && !rete.personaleConnesso) {
      mostra({ tipo: 'banner', testo: 'Non c’è nessuno nella stanza: la frase non è partita' });
      return;
    }
    const testo = fraseSemplice('invio');
    invia({ t: 'frase', testo });
    mostra({ tipo: 'banner', testo: `Mandata: ${testo}` });
  }

  function iniziaNuova(m: Modalita, l: Livello) {
    setGenerando(true);
    // un giro di pausa così il bottone mostra "preparo la griglia" prima del calcolo
    window.setTimeout(() => {
      try {
        gioco.iniziaNuova(m, l);
        setPartnerCursore(null);
        setVittoriaChiusa(null);
        setSchermata('partita');
      } finally {
        setGenerando(false);
      }
    }, 30);
  }

  function riprendi(v: VoceStorico) {
    if (!gioco.riprendi(v)) return;
    setPartnerCursore(null);
    setVittoriaChiusa(null);
    setSchermata('partita');
    mostra({ tipo: 'banner', testo: fraseSemplice('ripresa'), categoria: 'ripresa' });
  }

  function entra(nuovo: Io) {
    modifica((a) => ({ ...a, io: nuovo }));
    setSchermata('home');
  }

  function cambiaImpostazione(k: 'mostraErrori' | 'vibrazione', v: boolean) {
    modifica((a) => ({ ...a, impostazioni: { ...a.impostazioni, [k]: v } }));
  }

  function esportaMemoria() {
    try {
      const blob = new Blob([esporta(ref.current)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeFileEsportazione();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      mostra({ tipo: 'banner', testo: 'Non riesco a preparare il file della memoria' });
    }
  }

  function importaMemoria(testo: string) {
    const r = importa(ref.current, testo);
    if (!r) {
      mostra({ tipo: 'banner', testo: 'Questo file non è una memoria del giardino' });
      return;
    }
    modifica(() => r.archivio);
    mostra({ tipo: 'banner', testo: r.importate === 1 ? 'Importata 1 partita' : `Importate ${r.importate} partite` });
  }

  function cancellaInCorso() {
    modifica(cancellaPartita);
    gioco.chiudi();
    mostra({ tipo: 'banner', testo: 'La partita resta nel giardino, come germoglio' });
  }

  function ricominciaDaZero() {
    const dopo = modifica((a: Archivio) => ricomincia(a, Date.now()));
    gioco.chiudi();
    inviate.current.clear();
    invia({ t: 'storico', storico: [], azzerato: dopo.azzerato });
    mostra({ tipo: 'banner', testo: 'Giardino svuotato: si ricomincia da un seme' });
  }

  const stile = {
    '--mio': COLORI_RUOLO[mioRuolo],
    '--suo': COLORI_RUOLO[altro(mioRuolo)],
  } as CSSProperties;
  const testoVittoria = fraseVittoria && partita && fraseVittoria.iniziata === partita.iniziata ? fraseVittoria.testo : '';

  return (
    <div className="app" style={stile}>
      {schermata === 'ingresso' && (
        <Ingresso key="ingresso" iniziale={io} sbloccata={sbloccata} onEntra={entra} />
      )}
      {schermata === 'home' && io && (
        <Home
          key="home"
          nome={nomeMio}
          partnerNome={nomePartner}
          connessione={connessione}
          personaleConnesso={rete.personaleConnesso}
          occupata={rete.occupata}
          partita={partita}
          mioRuolo={mioRuolo}
          generando={generando}
          fiori={fiori}
          sbloccata={sbloccata}
          tappa={tappaHome}
          onChiudiTappa={() => setTappaHome(null)}
          chiacchiera={chiacchieraOra}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          mascotte={mascotte}
          mostraErrori={mostraErrori}
          vibrazione={vibrazione}
          tema={tema}
          onImpostazione={cambiaImpostazione}
          onTema={cambiaTema}
          onEsporta={esportaMemoria}
          onImporta={importaMemoria}
          onCancellaPartita={cancellaInCorso}
          onRicomincia={ricominciaDaZero}
          onContinua={() => setSchermata('partita')}
          onNuova={iniziaNuova}
          onGiardino={() => setSchermata('giardino')}
          onCambia={() => setSchermata('ingresso')}
        />
      )}
      {schermata === 'giardino' && (
        <Giardino
          key="giardino"
          storico={archivio.storico}
          inCorso={partita && !partita.finita ? `${partita.puzzle.modalita}-${partita.puzzle.seed}` : null}
          sbloccata={sbloccata}
          mascotte={mascotte}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          onRiprendi={riprendi}
          onEsci={() => setSchermata('home')}
        />
      )}
      {schermata === 'partita' && partita && (
        <Partita
          key="partita"
          partita={partita}
          mioRuolo={mioRuolo}
          partnerNome={nomePartner}
          connessione={connessione}
          personaleConnesso={rete.personaleConnesso}
          partnerCursore={partnerCursore}
          mostraErrori={mostraErrori}
          vibrazione={vibrazione}
          onImpostazione={cambiaImpostazione}
          sbloccata={sbloccata}
          mascotte={mascotte}
          chiacchiera={chiacchieraOra}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          onSuggerisci={gioco.suggerisci}
          onMossa={(i, v, note) => {
            sveglia();
            gioco.mossa(i, v, note);
          }}
          onAnnulla={gioco.annulla}
          puoAnnullare={gioco.puoAnnullare}
          onCursore={onCursore}
          onFrase={mandaFrase}
          onEsci={() => setSchermata('home')}
          lampo={lampo}
          arrivo={arrivo}
        />
      )}
      {vittoriaAperta && partita && (
        <Vittoria
          secondi={partita.secondi}
          frase={testoVittoria}
          sbloccata={sbloccata}
          mascotte={mascotte}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          puntiMiei={partita.contatori?.[mioRuolo]?.punti ?? 0}
          puntiSuoi={partita.contatori?.[altro(mioRuolo)]?.punti ?? 0}
          bonus={bonusVittoria(partita.secondi)}
          onNuova={() => iniziaNuova(partita.puzzle.modalita, partita.puzzle.livello)}
          onChiudi={() => setVittoriaChiusa(partita.iniziata)}
        />
      )}
      {scena && <ScenaSblocco onFine={fineScena} />}
      <Toasts attivi={attivi} />
    </div>
  );
}
