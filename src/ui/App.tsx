// Regia dell'app: archivio, due stanze di rete, partita, mascotte, schermate.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CARATTERE, FRASI } from '../config/frasi';
import type { ChiParla } from '../config/frasi';
import { dormePerOrario } from '../config/sonno';
import { giornoSpeciale } from '../config/storia';
import type { Battuta, Sblocco } from '../config/storia';
import { COLORI_RUOLO, PROFILI, nomeVisibile, profiloDiNome } from '../config/giocatori';
import type { Livello, Modalita } from '../engine';
import type { Messaggio } from '../net';
import type { VoceStorico } from '../stato';
import type { Archivio } from '../stato/archivio';
import { unisciStoricoRemoto } from '../stato/archivio';
import { AnnuncioSblocco } from './AnnuncioSblocco';
import { Giardino } from './Giardino';
import type { Arrivo, Lampo } from './Griglia';
import { Home } from './Home';
import type { Chiacchiera } from './Home';
import { BannerAggiornamento } from './Aggiornamento';
import { Ingresso } from './Ingresso';
import { cancellaPartita, esporta, importa, ioDaArchivio, nomeFileEsportazione, profiloConfermato, ricomincia } from './memoria';
import type { Tema } from './MenuHome';
import { Partita } from './Partita';
import {
  CHIAVE_SBLOCCO,
  SOLLETICO_OGNI_MS,
  accessorioDi,
  accessorioPermesso,
  bonusVittoria,
  chiacchiera,
  daRimandare,
  fioriDi,
  fraseMascotte,
  fraseSonno,
  frasiInvio,
  mascotteDi,
  nominaSemina,
  partitaToccata,
  presenzaBlu,
  regaliBonusDi,
  sblocchiNuovi,
  scegliFrase,
  scenaDaMostrare,
  seminaSbloccata,
  senzaSemina,
  solletico,
  sorpresaDaMostrare,
  sostituisci,
  stessiVisti,
  tappaDaMostrare,
  umoreEvento,
  vociCambiate,
} from './regole';
import type { CategoriaFrase, Tappa } from './regole';
import { ScenaSblocco } from './ScenaSblocco';
import { Toasts, useBattute, useToasts } from './Toasts';
import type { Tono } from './Toasts';
import { useArchivio } from './useArchivio';
import { useMascotte, useOgniTanto, useUltimeFrasi } from './useMascotte';
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
const AZZERAMENTO_RECENTE_MS = 10 * 60 * 1000;

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
  // giorno del mare / della montagna: solo dopo l'arrivo di Semina (le chiacchiere parlano di lei)
  const giorno = sbloccata ? giornoSpeciale(new Date()) : null;
  const { mostraErrori, vibrazione } = archivio.impostazioni;
  const partita = archivio.partita;

  // Nome libero di T1 (non "Semino"/"Semina"): l'Ingresso chiede una volta di confermare il colore,
  // già preselezionato da profiloDiNome; un nome non riconosciuto diventerebbe Blu in silenzio.
  const [schermata, setSchermata] = useState<Schermata>(() =>
    // Al (ri)avvio si parte sempre dalla Home: la partita in corso è lì, su "Continua" (richiesta di Genna).
    !io || !profiloConfermato(archivio) ? 'ingresso' : 'home',
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
  const [annuncio, setAnnuncio] = useState<Sblocco[] | null>(null);
  const [sorpresa, setSorpresa] = useState<{ iniziata: number; battute: Battuta[] } | null>(null);
  /** azione in attesa di conferma (nuova partita o ripresa con un'altra partita già iniziata) */
  const [daConfermare, setDaConfermare] = useState<{ azione: () => void } | null>(null);
  const { ultime, ricorda } = useUltimeFrasi();
  const { attivi, mostra } = useToasts();
  const { battuta, dici } = useBattute();
  const { mascotte, reagisci, sveglia } = useMascotte();

  // valori letti dai gestori di rete (sempre gli ultimi)
  const vivi = useRef({ nomeMio, nomePartner, sbloccata, mioRuolo, schermata, mostraErrori, vibrazione, mascotte, fiori, giorno });
  useEffect(() => {
    vivi.current = { nomeMio, nomePartner, sbloccata, mioRuolo, schermata, mostraErrori, vibrazione, mascotte, fiori, giorno };
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
  // ogni scelta evita le ultime frasi della sua categoria (memoria) e l'ultima detta in assoluto
  const evita = (categoria: string) => [...ultime(categoria), ultimaFrase.current];
  const usata = (categoria: string, t: string) => {
    ricorda(categoria, t);
    ultimaFrase.current = t;
    return t;
  };
  const frase = (c: CategoriaFrase, chi: ChiParla, n?: number) => {
    // svegliata nelle sue ore di sonno: una volta su due parla del sonno
    const sb = vivi.current.sbloccata;
    if (dormePerOrario(chi) && Math.random() < 0.5)
      return usata('sonno', fraseSonno(chi, evita('sonno'), new Date(), Math.random, { mossa: true, sbloccata: sb }));
    return usata(c, fraseMascotte(c, chi, evita(c), sost(n), Math.random, vivi.current.fiori, sb));
  };
  const fraseSemplice = (c: CategoriaFrase) => {
    const sb = vivi.current.sbloccata;
    const lista = c === 'invio' ? frasiInvio(vivi.current.fiori, sb) : senzaSemina(FRASI[c], sb);
    return usata(c, scegliFrase(lista, evita(c), sost()));
  };

  // --- reazioni delle mascotte (generate qui o arrivate dall'altro: si mostrano uguali) ------
  /**
   * In partita ogni frase esce dal fumetto di una mascotte (mai sopra la griglia); fuori, dal banner.
   * `chi`: 'mia' (default) o 'sua' = la mascotte mia o del partner (prima dello sblocco c'è solo Semino).
   */
  function annuncia(
    testo: string,
    o: { chi?: 'mia' | 'sua'; tono?: Tono; categoria?: string; firma?: string; inPartita?: boolean; ms?: number } = {},
  ) {
    const v = vivi.current;
    if (o.inPartita ?? v.schermata === 'partita') {
      const ruolo = o.chi === 'sua' ? altro(v.mioRuolo) : v.mioRuolo;
      const chi: ChiParla = v.sbloccata ? mascotteDi(ruolo) : 'semino';
      dici({ chi, testo, tono: o.tono ?? 'mio', categoria: o.categoria, firma: o.firma }, o.ms);
    } else mostra({ tipo: 'banner', testo, categoria: o.categoria });
  }

  function mostraChiacchiera(chi: ChiParla, testo: string) {
    // l'accessorio della frase solo se è già sbloccato e del suo carattere (in partita sono separati)
    const v = vivi.current;
    const accessorio = accessorioPermesso(chi, accessorioDi(chi, testo), v.fiori, { giorno: v.giorno });
    setChiacchieraOra({ id: Date.now(), chi, testo, accessorio });
    window.clearTimeout(timerChiacchiera.current);
    timerChiacchiera.current = window.setTimeout(() => setChiacchieraOra(null), DURATA_CHIACCHIERA_MS);
  }

  function mostraReazione(r: Reazione, dalPartner: boolean) {
    const v = vivi.current;
    // prima dello sblocco Semina non esiste: se un dispositivo indietro la nomina, si mostra Semino
    const chi: ChiParla = v.sbloccata ? r.chi : 'semino';
    // una frase arrivata da un dispositivo dove Semina è già arrivata non la rivela qui
    if (!v.sbloccata && r.testo && nominaSemina(r.testo)) {
      if (r.categoria === 'chiacchiera' || r.categoria === 'solletico') return;
      r = { ...r, testo: '' };
    }
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
    const prefisso = delPartner ? (PROFILI.find((p) => p.id === chi) ?? PROFILI[0]).nome : undefined;
    const errore = r.categoria === 'sbagliata' || r.categoria === 'sbagliataSerie';
    const tono: Tono = errore ? 'errore' : r.categoria === 'completato' ? 'completato' : dalPartner ? 'suo' : 'mio';
    if (v.schermata === 'partita') {
      dici({ chi, testo: r.testo, tono, categoria: r.categoria, firma: prefisso });
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
    // anche le frasi dell'altro dispositivo entrano nella memoria: non le ripeto subito
    if (testo) ricorda(categoria === 'chiacchiera' ? 'chiacchiere' : categoria, testo);
    const delPartner = da === 'coppia' || !!m.inoltrato;
    mostraReazione({ chi, umore: umore || 'neutro', categoria: categoria as Reazione['categoria'], testo, idx }, delPartner);
    if (delPartner && DA_APPLAUSO.has(categoria)) {
      if (idx !== undefined) setArrivo({ id: Date.now(), idx, tipo: 'evento' });
      if (categoria === 'brillante' || categoria === 'intelligente') annuncia(fraseSemplice('partnerBrillante'), { tono: 'suo', categoria: 'partnerBrillante' });
    }
  }

  /** tocco su una mascotte: reazione a caso, mai uguale alla precedente; dopo lo sblocco la vede anche l'altro */
  function onSolletico(chi: ChiParla) {
    const u = ultimoSolletico.current;
    const ora = Date.now();
    if (ora - u.ts < SOLLETICO_OGNI_MS) return;
    const v = vivi.current;
    if (!v.sbloccata && chi !== 'semino') return;
    const r = solletico(chi, u.umore, [...ultime('solletico'), u.testo], sost(), Math.random, v.sbloccata);
    if (dormePerOrario(chi) && Math.random() < 0.5)
      r.testo = fraseSonno(chi, [...ultime('sonno'), u.testo], new Date(), Math.random, { sbloccata: v.sbloccata });
    ricorda('solletico', r.testo);
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
      regaliGiardino: (n) =>
        annuncia(n === 1 ? 'Regalo del giardino: un suggerimento in più' : `Regalo del giardino: ${n} suggerimenti in più`, {
          categoria: 'regalo',
          inPartita: true,
        }),
      vibra: (schema) => {
        if (vivi.current.vibrazione) navigator.vibrate?.(schema);
      },
      vittoria: () => {
        const p = ref.current.partita;
        if (!p) return;
        setVittoriaChiusa(null);
        // sorpresa di questo numero di fiori: una volta per dispositivo (segnata subito come vista)
        const a = ref.current;
        const s = sorpresaDaMostrare(fioriDi(a.storico), a.tappeViste, vivi.current.sbloccata);
        if (s) {
          setSorpresa({ iniziata: p.iniziata, battute: s.battute });
          modifica((x) => (x.tappeViste.includes(s.chiave) ? x : { ...x, tappeViste: [...x.tappeViste, s.chiave] }));
        }
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
    const azzeratoPrima = ref.current.azzerato;
    const dopo = modifica((a) => unisciStoricoRemoto(a, remoti, azzerato));
    // l'altra persona ha ricominciato da zero: lo si dice (in Home: la partita qui si è chiusa)
    // (solo se recente: un dispositivo nuovo che riceve un azzeramento vecchio non lo annuncia)
    if (dopo.azzerato > azzeratoPrima && azzerato === dopo.azzerato && Date.now() - dopo.azzerato < AZZERAMENTO_RECENTE_MS) {
      const chi = da === 'coppia' ? profiloPartner.nomeReale : '';
      mostra({
        tipo: 'banner',
        testo: chi ? `${chi} ha ricominciato da zero: il giardino riparte` : 'Da un altro tuo dispositivo: si ricomincia da zero',
      });
    }
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
          ultimoEvento.current = Date.now();
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
          annuncia(eraGermoglio ? fraseSemplice('ripresa') : `${vivi.current.nomePartner} ha iniziato una nuova partita`, {
            chi: 'sua',
            tono: 'suo',
            categoria: eraGermoglio ? 'ripresa' : undefined,
            inPartita: vivi.current.schermata !== 'ingresso',
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
        if (dalPartner(m, da) && !(nominaSemina(m.testo ?? '') && !vivi.current.sbloccata)) {
          // in partita la frase del partner esce dal suo fumetto, col suo colore; fuori, grande al centro
          if (vivi.current.schermata === 'partita') annuncia(m.testo, { chi: 'sua', tono: 'suo', firma: vivi.current.nomePartner, categoria: 'frase', ms: 4500 });
          else mostra({ tipo: 'grande', testo: m.testo, firma: vivi.current.nomePartner, colore: 'var(--suo)' });
        }
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
    annuncia(fraseSemplice('arrivo'), { chi: 'sua', tono: 'suo', categoria: 'arrivo' });
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

  // in partita le chiacchiere aspettano 45 s di quiete: si conta da quando si entra (o arriva una griglia nuova)
  const seedInGioco = schermata === 'partita' ? partita?.puzzle.seed : undefined;
  useEffect(() => {
    if (seedInGioco !== undefined) ultimoEvento.current = Date.now();
  }, [seedInGioco]);

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

  // entrando nella Home: gli sblocchi nuovi per questo dispositivo (annuncio dell'ultima soglia, i
  // suoi regali messi da parte per la prossima partita, tutti segnati come visti)
  useEffect(() => {
    if (!chiaveHome) return;
    const a = ref.current;
    const n = sblocchiNuovi(fioriDi(a.storico), a.sbloccatiVisti);
    // l'arrivo di Semina l'ha già raccontato la scena: niente secondo annuncio (il regalo arriva lo stesso)
    if (n.annuncio.length && !n.annuncio.some((s) => s.tipo === 'elemento' && s.id === 'semina')) setAnnuncio(n.annuncio);
    if (n.regali || !stessiVisti(a.sbloccatiVisti, n.visti)) {
      modifica((x) => ({ ...x, sbloccatiVisti: n.visti, regaliBonus: regaliBonusDi(x.regaliBonus) + n.regali }));
    }
  }, [chiaveHome, ref, modifica]);

  function fineScena() {
    modifica((a) => (a.tappeViste.includes(CHIAVE_SBLOCCO) ? a : { ...a, tappeViste: [...a.tappeViste, CHIAVE_SBLOCCO] }));
    reagisci('semino', 'felice');
    reagisci('semina', 'euforico');
  }

  // --- chiacchiere: ogni 40–60 s, mai sopra la storia, in partita solo dopo 45 s di quiete ------
  useOgniTanto(!!io && (schermata === 'home' || schermata === 'partita'), () => {
    const ora = Date.now();
    if (tappaHome || scena || vittoriaAperta || annuncio) return;
    if (vivi.current.schermata === 'partita' && ora - ultimoEvento.current < SILENZIO_PARTITA_MS) return;
    if (connessione === 'connesso' && ora - ultimaChiacchieraRicevuta.current < RISPETTA_CHIACCHIERA_MS) return;
    const chi: ChiParla = vivi.current.sbloccata ? prossimaChi.current : 'semino';
    prossimaChi.current = chi === 'semino' ? 'semina' : 'semino';
    // chi dorme non chiacchiera
    if (vivi.current.mascotte[chi].umore === 'dorme') return;
    const testo = chiacchiera(chi, evita('chiacchiere'), sost(), Math.random, {
      fiori: vivi.current.fiori,
      giorno: vivi.current.giorno,
      sbloccata: vivi.current.sbloccata,
    });
    if (!testo) return;
    usata('chiacchiere', testo);
    const r: Reazione = { chi, umore: CARATTERE[chi].umoreBase, categoria: 'chiacchiera', testo };
    mostraReazione(r, false);
    inviaReazione(r);
  });

  // --- azioni ------------------------------------------------------------------------
  // verso entrambe: il mio altro dispositivo non le mostra (non sono del partner) ma le inoltra
  const onCursore = useCallback((idx: number | null) => invia({ t: 'cursore', idx }), [invia]);

  /** Sei frasi da proporre nel foglio "Frase" (diverse fra loro, evitando le ultime mandate). */
  function frasiDaScegliere(): string[] {
    const v = vivi.current;
    const tutte = [...new Set(frasiInvio(v.fiori, v.sbloccata).map((t) => sostituisci(t, sost())))];
    const recenti = new Set(ultime('invio'));
    const fresche = tutte.filter((t) => !recenti.has(t));
    const da = fresche.length >= 6 ? fresche : tutte;
    for (let i = da.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [da[i], da[j]] = [da[j], da[i]];
    }
    return da.slice(0, 6);
  }

  function mandaFrase(scelta?: string) {
    if (connessione !== 'connesso' && !rete.personaleConnesso) {
      annuncia('Non c’è nessuno nella stanza: la frase non è partita', { tono: 'errore' });
      return;
    }
    const testo = scelta ? usata('invio', scelta) : fraseSemplice('invio');
    invia({ t: 'frase', testo });
    annuncia(`Mandata: ${testo}`, { categoria: 'invio' });
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

  /** Con una partita già toccata in corso si chiede prima (resta nel giardino come germoglio). */
  function conConferma(azione: () => void) {
    const p = ref.current.partita;
    if (p && !p.finita && partitaToccata(p)) setDaConfermare({ azione });
    else azione();
  }

  function riprendi(v: VoceStorico) {
    if (!gioco.riprendi(v)) return;
    setPartnerCursore(null);
    setVittoriaChiusa(null);
    setSchermata('partita');
    annuncia(fraseSemplice('ripresa'), { categoria: 'ripresa', inPartita: true });
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
      <BannerAggiornamento />
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
          giorno={giorno}
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
          onNuova={(m, l) => conConferma(() => iniziaNuova(m, l))}
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
          bluPresenza={blu}
          mascotte={mascotte}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          onRiprendi={(v) => conConferma(() => riprendi(v))}
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
          battuta={battuta}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          onSuggerisci={gioco.suggerisci}
          onMossa={(i, v, note) => {
            // anche note e cancellature sono "giocare": niente chiacchiere per i prossimi 45 s
            ultimoEvento.current = Date.now();
            sveglia();
            gioco.mossa(i, v, note);
          }}
          onAnnulla={gioco.annulla}
          puoAnnullare={gioco.puoAnnullare}
          onCursore={onCursore}
          onFrase={mandaFrase}
          frasiDaScegliere={frasiDaScegliere}
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
          fiori={fiori}
          bluPresenza={blu}
          sorpresa={sorpresa && sorpresa.iniziata === partita.iniziata ? sorpresa.battute : null}
          onNuova={() => iniziaNuova(partita.puzzle.modalita, partita.puzzle.livello)}
          onChiudi={() => setVittoriaChiusa(partita.iniziata)}
        />
      )}
      {daConfermare && (
        <ConfermaNuova
          onNuova={() => {
            setDaConfermare(null);
            daConfermare.azione();
          }}
          onContinua={() => {
            setDaConfermare(null);
            if (ref.current.partita) setSchermata('partita');
          }}
          onChiudi={() => setDaConfermare(null)}
        />
      )}
      {scena && <ScenaSblocco onFine={fineScena} />}
      {annuncio && schermata === 'home' && !scena && (
        <AnnuncioSblocco sblocchi={annuncio} fiori={fiori} bluPresenza={blu} onChiudi={() => setAnnuncio(null)} />
      )}
      <Toasts attivi={attivi} />
    </div>
  );
}

/** Conferma leggera prima di lasciare una partita iniziata per un'altra. */
function ConfermaNuova({ onNuova, onContinua, onChiudi }: { onNuova: () => void; onContinua: () => void; onChiudi: () => void }) {
  return (
    <div className="foglio-velo" onPointerDown={(e) => e.target === e.currentTarget && onChiudi()}>
      <div className="foglio" role="alertdialog" aria-modal="true" aria-labelledby="conferma-nuova-titolo" data-testid="conferma-nuova">
        <div className="foglio-passo">
          <h2 id="conferma-nuova-titolo">Nuova partita?</h2>
          <p>La partita in corso resta nel giardino come germoglio.</p>
          <div className="foglio-azioni">
            <button className="bottone" data-testid="nuova-continua" onClick={onContinua}>
              Continua quella
            </button>
            <button className="bottone primario" data-testid="nuova-conferma" onClick={onNuova}>
              Nuova
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
