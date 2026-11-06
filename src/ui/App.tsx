// Regia dell'app: archivio, due stanze di rete, partita, mascotte, schermate.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CARATTERE, FRASI } from '../config/frasi';
import type { ChiParla } from '../config/frasi';
import { dormePerOrario } from '../config/sonno';
import { SEMINA_ARRIVA_A, capitolo as capitoloDi } from '../config/capitoli';
import type { Capitolo } from '../config/capitoli';
import { giornoSpeciale } from '../config/storia';
import { luogoDelVestito, luoghiVisitati } from '../config/luoghi';
import { COLORI_RUOLO, PROFILI, nomeVisibile, profiloDiNome } from '../config/giocatori';
import type { Livello, Modalita } from '../engine';
import type { Messaggio } from '../net';
import type { Giocatore, StatoPartita, VoceStorico } from '../stato';
import type { Archivio } from '../stato/archivio';
import { conDettaglioFiore, conPosta, unisciStoricoRemoto } from '../stato/archivio';
import { CapitoloScena } from './CapitoloScena';
import { codaCapitoli, diario, ecoDaMostrare, ecoDi, giardinoDelCapitolo, giardinoVisibile, seminaSbloccata, vistiDi } from './capitoli';
import { Giardino } from './Giardino';
import type { Arrivo, Lampo } from './Griglia';
import { Home } from './Home';
import { vestitiGrandi } from './vestiti';
import { useMomento } from './momento';
import type { Chiacchiera } from './Home';
import { BannerAggiornamento } from './Aggiornamento';
import { Ingresso } from './Ingresso';
import { cancellaPartita, esporta, importa, ioDaArchivio, nomeFileEsportazione, profiloConfermato, ricomincia } from './memoria';
import type { Tema } from './Menu';
import { Partita } from './Partita';
import { FoglioPosta } from './Posta';
import {
  SOLLETICO_OGNI_MS,
  accessorioDi,
  accessorioPermesso,
  chiacchieraPermessa,
  bonusVittoria,
  chiacchiera,
  daRimandare,
  fioriDi,
  fraseMascotte,
  fraseSonno,
  frasiDelLuogo,
  frasiInvio,
  frasiNuove,
  mascotteDi,
  nominaSemina,
  partitaToccata,
  scegliFrase,
  senzaSemina,
  solletico,
  sostituisci,
  stessiVisti,
  testoDi,
  testoFrasiNuove,
  umoreEvento,
  vociCambiate,
} from './regole';
import type { CategoriaFrase } from './regole';
import { Scena } from './Scena';
import { accessorioValido } from './useMascotte';
import { FESTA_MS, USCITA_MS, apriLettore, avanza, capitoloDelLettore, conCapitoloVisto, leggiAdesso } from './lettore';
import type { Lettore, Riassunto } from './lettore';
import { useChiudiConIndietro, useGestoIndietro } from './indietro';
import { useDialogo } from './dialogo';
import { chiudiToccandoFuori } from './velo';
import { CHIAVE_SUGGERIMENTI, TESTI_SUGGERIMENTI, suggerimentiVisti, suggerimentoDa } from './suggerimenti';
import type { EventoSuggerimento } from './suggerimenti';
import { Toasts, useBattute, useToasts } from './Toasts';
import type { Tono } from './Toasts';
import { useArchivio } from './useArchivio';
import { useSync } from './useSync';
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
const DURATA_ECO_MS = 8000;
/** uscita di una schermata (tema.css `esce`) */
const USCITA_SCHERMATA_MS = 150;

/** I vestiti dei capitoli si disegnano solo se esistono già (T6 ne aggiunge altri). */
const vestitoDisegnato = (id: string) => !!accessorioValido(id);

/** La carta di vittoria salvata alla fine della partita (resta giusta se il partner ne apre un'altra). */
function riassuntoDi(p: StatoPartita, mio: Giocatore): Riassunto {
  return {
    iniziata: p.iniziata,
    secondi: p.secondi,
    puntiMiei: p.contatori?.[mio]?.punti ?? 0,
    puntiSuoi: p.contatori?.[altro(mio)]?.punti ?? 0,
    bonus: bonusVittoria(p.secondi),
  };
}

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
  // capitoli letti da chi tiene il telefono (per ruolo, non per coppia)
  const vistiMiei = vistiDi(archivio.capitoliVisti, mioRuolo);
  // Semina "esiste" su questo dispositivo solo dopo il suo capitolo (il 5): prima la vittoria che la
  // porta (o lo storico del partner) non deve rivelarla (Vittoria, cruscotto, nomi, voce).
  const sbloccata = seminaSbloccata(fiori, vistiMiei);
  const nomeMio = nomeVisibile(profilo, sbloccata);
  const nomePartner = nomeVisibile(profiloPartner, sbloccata);
  // luoghi del viaggio già visitati da chi tiene il telefono (vestiti, chiacchiere dei luoghi)
  const luoghi = useMemo(() => luoghiVisitati(vistiMiei), [vistiMiei]);
  // giorno del mare / della montagna: solo dopo l'arrivo di Semina (le chiacchiere parlano di lei)
  // e solo se quel luogo è già stato visitato (prima il mare non c'è ancora)
  const oggi = sbloccata ? giornoSpeciale(new Date()) : null;
  const giorno = oggi && luoghi.includes(oggi) ? oggi : null;
  const { mostraErrori, vibrazione } = archivio.impostazioni;
  const partita = archivio.partita;

  // Nome libero di T1 (non "Semino"/"Semina"): l'Ingresso chiede una volta di confermare il colore,
  // già preselezionato da profiloDiNome; un nome non riconosciuto diventerebbe Blu in silenzio.
  const [schermata, setSchermata] = useState<Schermata>(() =>
    // Al (ri)avvio si parte sempre dalla Home: la partita in corso è lì, su "Continua" (richiesta di Genna).
    !io || !profiloConfermato(archivio) ? 'ingresso' : 'home',
  );
  // cambio di schermata con uscita breve: la vecchia si dissolve (150 ms), all'animationend entra la nuova
  const [verso, setVerso] = useState<Schermata | null>(null);
  const versoRef = useRef<Schermata | null>(null);
  const timerVai = useRef(0);
  const arriva = useCallback(() => {
    const s = versoRef.current;
    if (s === null) return;
    versoRef.current = null;
    window.clearTimeout(timerVai.current);
    setVerso(null);
    setSchermata(s);
  }, []);
  const [tema, setTema] = useState<Tema>(leggiTema);
  const [partnerCursore, setPartnerCursore] = useState<number | null>(null);
  const [lampo, setLampo] = useState<Lampo | null>(null);
  const [arrivo, setArrivo] = useState<Arrivo | null>(null);
  const [generando, setGenerando] = useState(false);
  const [vittoriaChiusa, setVittoriaChiusa] = useState<number | null>(null);
  const [fraseVittoria, setFraseVittoria] = useState<{ iniziata: number; testo: string } | null>(null);
  const [chiacchieraOra, setChiacchieraOra] = useState<Chiacchiera | null>(null);
  const [solleticoOra, setSolleticoOra] = useState<Chiacchiera | null>(null);
  // storia: il lettore dei capitoli (coda congelata all'apertura), la rilettura dal diario
  const [lettore, setLettore] = useState<Lettore | null>(null);
  const [rilettura, setRilettura] = useState<number | null>(null);
  const [esce, setEsce] = useState(false);
  /** partita (iniziata) di cui è finita la festa sulla griglia */
  const [festa, setFesta] = useState<number | null>(null);
  /** partita (iniziata) i cui capitoli sono già stati letti o rimandati ("Dopo"): ora la carta */
  const [fattoPer, setFattoPer] = useState<number | null>(null);
  /** carta di vittoria di una partita già sostituita dal partner mentre leggevo: "Vai" */
  const [cartaVai, setCartaVai] = useState<Riassunto | null>(null);
  /** azione in attesa di conferma (nuova partita o ripresa con un'altra partita già iniziata) */
  const [daConfermare, setDaConfermare] = useState<{ azione: () => void } | null>(null);
  /** la cassetta della posta aperta (Home o Giardino) */
  const [postaAperta, setPostaAperta] = useState(false);
  const { ultime, ricorda } = useUltimeFrasi();
  const { attivi, mostra, chiudi: chiudiToast } = useToasts();
  const { battuta, dici, ferma: fermaBattute, riprendi: riprendiBattute } = useBattute();
  const { mascotte, reagisci, sveglia } = useMascotte();

  /** Va a un'altra schermata passando dall'uscita (niente se ci si è già e non si sta uscendo). */
  function vai(s: Schermata) {
    if (versoRef.current === null && s === vivi.current.schermata) return;
    setPostaAperta(false);
    versoRef.current = s;
    setVerso(s);
    window.clearTimeout(timerVai.current);
    // riserva: se l'animationend non arriva (scheda nascosta, animazioni spente) si cambia lo stesso
    timerVai.current = window.setTimeout(arriva, USCITA_SCHERMATA_MS + 120);
  }
  useEffect(() => () => window.clearTimeout(timerVai.current), []);

  // valori letti dai gestori di rete (sempre gli ultimi)
  const vivi = useRef({ nomeMio, nomePartner, sbloccata, mioRuolo, schermata, mostraErrori, vibrazione, mascotte, fiori, giorno, vistiMiei, luoghi });
  useEffect(() => {
    vivi.current = { nomeMio, nomePartner, sbloccata, mioRuolo, schermata, mostraErrori, vibrazione, mascotte, fiori, giorno, vistiMiei, luoghi };
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
  // il giardino che si vede su questo dispositivo: niente tulipano né blu di Semina prima del capitolo 5 visto
  const giardino = giardinoVisibile(fiori, vistiMiei);
  // quanto blu negli accenti di coppia: sul root, così arriva anche alla grana del body
  const blu = giardino.bluPresenza;
  useEffect(() => {
    document.documentElement.style.setProperty('--blu-presenza', String(blu));
  }, [blu]);
  // il cielo della scena segue l'ora (solo col tema "auto"; il lettore dei capitoli resta di notte)
  const momento = useMomento(tema);
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

  function mostraChiacchiera(chi: ChiParla, testo: string, o: { firma?: string; ms?: number; accessorio?: string } = {}) {
    // l'accessorio della frase solo se il suo luogo è visitato e se è del suo carattere (in partita sono separati)
    const v = vivi.current;
    // una chiacchiera di un luogo che qui non è ancora visitato (es. dal partner più avanti) non si dice
    if (!chiacchieraPermessa(chi, testo, v.luoghi)) return;
    const accessorio = o.accessorio ?? accessorioPermesso(chi, accessorioDi(chi, testo), v.vistiMiei, { inCoppia: v.sbloccata, giorno: v.giorno });
    setChiacchieraOra({ id: Date.now(), chi, testo, accessorio, firma: o.firma });
    window.clearTimeout(timerChiacchiera.current);
    timerChiacchiera.current = window.setTimeout(() => setChiacchieraOra(null), o.ms ?? DURATA_CHIACCHIERA_MS);
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
        // festa sulla griglia (reazione e lampo); il capitolo e la carta arrivano dopo (FESTA_MS)
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
        if (vivi.current.schermata !== 'ingresso') vai('partita');
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
          // nella cassetta della posta (chi l'ha mandata la registra a sua volta: il sync le fonde)
          if (typeof m.testo === 'string' && m.testo) {
            const testo = m.testo.slice(0, 200);
            modifica((a) => conPosta(a, { ts: Date.now(), da: altro(vivi.current.mioRuolo), testo }));
          }
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
  // memoria condivisa (Worker): un terzo "dispositivo" che passa dallo stesso merge; nulla va al P2P
  const sync = useSync({ archivio, ref, modifica, frase: io?.frase ?? null, riceviPartita: (p) => gioco.riceviStato(p) });
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
  // mentre leggo un capitolo la partita nuova (aperta dal partner) aspetta: il mio timer è fermo
  const leggendo = !!lettore || rilettura !== null || !!cartaVai;
  const inGioco = schermata === 'partita' && !!partita && !partita.finita && !leggendo;
  const tick = gioco.tick;
  useEffect(() => {
    if (!inGioco) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') tick();
    }, 1000);
    return () => window.clearInterval(t);
  }, [inGioco, tick]);

  // partita finita: punti di ciascuno e ultima cella restano per il dettaglio del fiore nel Giardino
  const chiaveFinita = partita?.finita
    ? `${partita.iniziata}-${partita.contatori?.a?.punti ?? 0}-${partita.contatori?.b?.punti ?? 0}`
    : null;
  useEffect(() => {
    if (chiaveFinita) modifica((a) => (a.partita?.finita ? conDettaglioFiore(a, a.partita) : a));
  }, [chiaveFinita, modifica]);

  // --- storia: capitoli dopo la vittoria e dalla Home ------------------------------------------
  // Tutto derivato dallo stato: la coda (capitoli con fiore ≤ fiori non letti da me) si congela
  // quando il lettore si apre e non cresce finché non si chiude.
  const coda = useMemo(() => codaCapitoli(fiori, vistiMiei), [fiori, vistiMiei]);
  const finitaQui = schermata === 'partita' && !!partita?.finita && vittoriaChiusa !== partita.iniziata;
  const iniziataFinita = finitaQui ? partita!.iniziata : null;
  // ~900 ms di festa sulla griglia prima del capitolo
  useEffect(() => {
    if (iniziataFinita === null) return;
    const t = window.setTimeout(() => setFesta(iniziataFinita), FESTA_MS);
    return () => window.clearTimeout(t);
  }, [iniziataFinita]);
  if (!lettore && iniziataFinita !== null && festa === iniziataFinita && fattoPer !== iniziataFinita && coda.length > 0) {
    setLettore(apriLettore(fiori, vistiMiei, 'vittoria', archivio.azzerato, riassuntoDi(partita!, mioRuolo)));
  }
  // un azzeramento (anche dal partner) chiude il lettore: la coda di prima non vale più
  if (lettore && lettore.azzerato !== archivio.azzerato) setLettore(null);
  const capitoloAperto = capitoloDelLettore(lettore);
  const vittoriaAperta = finitaQui && !lettore && !cartaVai && (coda.length === 0 || fattoPer === iniziataFinita);

  function chiudiLettore(l: Lettore) {
    setLettore(null);
    if (l.origine !== 'vittoria' || !l.riassunto) return;
    const p = ref.current.partita;
    setFattoPer(l.riassunto.iniziata);
    // il partner ha già aperto un'altra partita: la carta di quella finita, con "Vai"
    if (!p || p.iniziata !== l.riassunto.iniziata) setCartaVai(l.riassunto);
  }

  /** "Continua" alla fine di un capitolo: visto (e regalo), poi il successivo o la carta. */
  function continuaCapitolo() {
    const l = lettore;
    const c = capitoloDelLettore(l);
    if (!l || !c || esce) return;
    modifica((a) => conCapitoloVisto(a, mioRuolo, c.fiore));
    if (c.fiore === SEMINA_ARRIVA_A) {
      reagisci('semino', 'felice');
      reagisci('semina', 'euforico');
    }
    const dopo = avanza(l);
    if (dopo) {
      setLettore(dopo);
      return;
    }
    setEsce(true);
    window.setTimeout(() => {
      setEsce(false);
      chiudiLettore(l);
    }, USCITA_MS);
  }

  function chiudiRilettura() {
    if (esce) return;
    setEsce(true);
    window.setTimeout(() => {
      setEsce(false);
      setRilettura(null);
    }, USCITA_MS);
  }

  /**
   * Fondale di aiuola e giardino: la Scena della Home com'era a quel capitolo (Semina mai prima del 5),
   * intera e posata sul prato del fondale; il cielo (sempre notte, stelle e luna) è del Fondale.
   */
  function sfondoDi(c: Capitolo) {
    const v = c.fondale ?? c.luogo;
    if (v !== 'aiuola' && v !== 'giardino') return undefined;
    const g = giardinoDelCapitolo(c.fiore, fiori);
    return (
      <div className="capitolo-sfondo" aria-hidden="true">
        <Scena
          elementi={g.elementi.filter((e) => e !== 'stelle')}
          fiori={Math.min(fiori, c.fiore)}
          bluPresenza={g.bluPresenza}
          altezza={240}
          intera
          senzaEntrate
        />
      </div>
    );
  }

  // entrando nella Home: l'eco dell'ultimo capitolo letto, una volta (poi entra nelle chiacchiere)
  const ecoOra = schermata === 'home' && !lettore && rilettura === null ? ecoDaMostrare(vistiMiei, archivio.ecoViste) : null;
  const chiaveEcoOra = ecoOra?.chiave ?? null;
  useEffect(() => {
    if (!ecoOra) return;
    // prima dell'arrivo di Semina qui le sue eco non si dicono (non dovrebbero esserci: i dati lo garantiscono)
    if (ecoOra.chi === 'semino' || vivi.current.sbloccata) {
      const nome = ecoOra.chi === 'semina' ? 'Semina' : 'Semino';
      mostraChiacchiera(ecoOra.chi, sostituisci(ecoOra.testo, sost()), { firma: `${nome} · dal capitolo ${ecoOra.fiore}`, ms: DURATA_ECO_MS });
    }
    const k = ecoOra.chiave;
    modifica((a) => (a.ecoViste.includes(k) ? a : { ...a, ecoViste: [...a.ecoViste, k] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaveEcoOra]);

  // entrando nella Home: i pacchetti di frasi nuovi per questo dispositivo, con un toast
  const chiaveHome = schermata === 'home' && !lettore ? `${fiori}-${archivio.azzerato}-${sbloccata}` : null;
  useEffect(() => {
    if (!chiaveHome) return;
    const a = ref.current;
    const sb = vivi.current.sbloccata;
    const n = frasiNuove(fioriDi(a.storico), a.sbloccatiVisti, sb);
    if (n.nuove.length) mostra({ tipo: 'banner', testo: testoFrasiNuove(n.nuove, sb) });
    if (!stessiVisti(a.sbloccatiVisti, n.visti)) modifica((x) => ({ ...x, sbloccatiVisti: n.visti }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaveHome]);

  /** La prima volta che un vestito compare in Home (lo dice Home): una chiacchiera del suo luogo, con quel vestito. */
  function vestitoNuovo(chi: ChiParla, id: string) {
    const l = luogoDelVestito(id);
    if (!l || (chi === 'semina' && !vivi.current.sbloccata)) return;
    const tutte = senzaSemina(frasiDelLuogo(l, chi), vivi.current.sbloccata);
    // meglio una frase che parla proprio di quel vestito, se c'è
    const sue = tutte.filter((f) => typeof f !== 'string' && f.accessorio === id);
    const lista = (sue.length ? sue : tutte).map(testoDi);
    if (!lista.length) return;
    const testo = usata('chiacchiere', scegliFrase(lista, evita('chiacchiere'), sost()));
    mostraChiacchiera(chi, testo, { accessorio: id });
  }

  // --- chiacchiere: ogni 40–60 s, mai sopra la storia, in partita solo dopo 45 s di quiete ------
  useOgniTanto(!!io && (schermata === 'home' || schermata === 'partita'), () => {
    const ora = Date.now();
    if (leggendo || vittoriaAperta) return;
    if (vivi.current.schermata === 'partita' && ora - ultimoEvento.current < SILENZIO_PARTITA_MS) return;
    if (connessione === 'connesso' && ora - ultimaChiacchieraRicevuta.current < RISPETTA_CHIACCHIERA_MS) return;
    const chi: ChiParla = vivi.current.sbloccata ? prossimaChi.current : 'semino';
    prossimaChi.current = chi === 'semino' ? 'semina' : 'semino';
    // chi dorme non chiacchiera
    if (vivi.current.mascotte[chi].umore === 'dorme') return;
    // le eco dei capitoli letti da me (in Home), con peso basso
    const eco = vivi.current.schermata === 'home' ? ecoDi(vivi.current.vistiMiei, chi) : [];
    const testo = chiacchiera(chi, evita('chiacchiere'), sost(), Math.random, {
      fiori: vivi.current.fiori,
      giorno: vivi.current.giorno,
      sbloccata: vivi.current.sbloccata,
      eco,
      luoghi: vivi.current.luoghi,
    });
    if (!testo) return;
    usata('chiacchiere', testo);
    const r: Reazione = { chi, umore: CARATTERE[chi].umoreBase, categoria: 'chiacchiera', testo };
    mostraReazione(r, false);
    // un'eco resta qui: il partner quel capitolo forse non l'ha ancora letto
    if (!eco.some((e) => sostituisci(e, sost()) === testo)) inviaReazione(r);
  });

  // --- gesto indietro (Android): chiude l'ultimo foglio aperto o torna alla Home, mai fuori dall'app ----
  useGestoIndietro(
    () => ({ schermata: versoRef.current ?? schermata, entrato: !!io && profiloConfermato(ref.current), bloccato: !!lettore }),
    () => vai('home'),
  );
  useChiudiConIndietro(rilettura !== null && !lettore, chiudiRilettura);
  useChiudiConIndietro(vittoriaAperta && !!partita, () => partita && setVittoriaChiusa(partita.iniziata));
  useChiudiConIndietro(!!cartaVai && !lettore, () => setCartaVai(null));
  useChiudiConIndietro(!!daConfermare, () => setDaConfermare(null));

  // --- suggerimenti una tantum sui gesti (uno per sessione, ognuno una volta per dispositivo) ----
  const suggerito = useRef(false);
  const chiacchieraAperta = useRef(false);
  chiacchieraAperta.current = !!chiacchieraOra || !!solleticoOra;
  function suggerisci(evento: EventoSuggerimento) {
    if (suggerito.current) return;
    const v = vivi.current;
    const p = ref.current.partita;
    const mosse = p ? Object.values(p.celle).filter((c) => c.da === v.mioRuolo).length : 0;
    const visti = suggerimentiVisti(leggi(CHIAVE_SUGGERIMENTI));
    const s = suggerimentoDa(evento, { mosse, fiori: v.fiori }, visti, suggerito.current);
    if (!s) return;
    suggerito.current = true;
    scrivi(CHIAVE_SUGGERIMENTI, [...visti, s]);
    const chi: ChiParla = v.sbloccata ? mascotteDi(v.mioRuolo) : 'semino';
    if (evento === 'home') mostraChiacchiera(chi, TESTI_SUGGERIMENTI[s], { ms: DURATA_CHIACCHIERA_MS });
    else dici({ chi, testo: TESTI_SUGGERIMENTI[s], tono: 'mio', categoria: 'suggerimento' });
  }
  // in Home, dopo 4 s fermi e senza fumetti aperti: "puoi toccarmi"
  const homeQuieta = schermata === 'home' && verso === null && !lettore && rilettura === null && fiori >= 1;
  useEffect(() => {
    if (!homeQuieta) return;
    const t = window.setTimeout(() => {
      if (!chiacchieraAperta.current) suggerisci('home');
    }, 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeQuieta]);

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
    modifica((a) => conPosta(a, { ts: Date.now(), da: vivi.current.mioRuolo, testo }));
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
        vai('partita');
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
    vai('partita');
    annuncia(fraseSemplice('ripresa'), { categoria: 'ripresa', inPartita: true });
  }

  function entra(nuovo: Io) {
    modifica((a) => ({ ...a, io: nuovo }));
    vai('home');
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
    sync.sincronizzaOra();
    mostra({ tipo: 'banner', testo: r.importate === 1 ? 'Importata 1 partita' : `Importate ${r.importate} partite` });
  }

  function cancellaInCorso() {
    modifica(cancellaPartita);
    gioco.chiudi();
    mostra({ tipo: 'banner', testo: 'La partita resta nel giardino, come germoglio' });
  }

  /** Dal menù della partita: la partita va nel giardino e si torna subito alla Home (la Partita non c'è più). */
  function cancellaDallaPartita() {
    window.clearTimeout(timerVai.current);
    versoRef.current = null;
    setVerso(null);
    setSchermata('home');
    cancellaInCorso();
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
      {/* sotto il lettore (o la rilettura) tutto è inert; la carta "Vai" invece si tocca */}
      <div
        className="app-sotto"
        inert={!!lettore || rilettura !== null}
        data-esce={verso !== null ? '' : undefined}
        onAnimationEnd={(e) => {
          if (verso !== null && /^esce/.test(e.animationName) && (e.target as Element).classList?.contains('schermata')) arriva();
        }}
      >
      {schermata === 'ingresso' && (
        <Ingresso key="ingresso" iniziale={io} sbloccata={sbloccata} vestiti={vestitiGrandi(mioRuolo, { visti: vistiMiei, sbloccata, giorno })} onEntra={entra} />
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
          giardino={giardino}
          giorno={giorno}
          visti={vistiMiei}
          momento={momento}
          onVestitoNuovo={vestitoNuovo}
          ecoInArrivo={!!ecoOra}
          daLeggere={coda.length}
          onLeggi={() => setLettore(apriLettore(fiori, vistiMiei, 'home', archivio.azzerato))}
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
          sync={sync}
          onSincronizza={sync.sincronizzaOra}
          onContinua={() => vai('partita')}
          onNuova={(m, l) => conConferma(() => iniziaNuova(m, l))}
          onGiardino={() => vai('giardino')}
          onCambia={() => vai('ingresso')}
          onPosta={() => setPostaAperta(true)}
        />
      )}
      {schermata === 'giardino' && (
        <Giardino
          key="giardino"
          storico={archivio.storico}
          inCorso={partita && !partita.finita ? `${partita.puzzle.modalita}-${partita.puzzle.seed}` : null}
          sbloccata={sbloccata}
          visti={vistiMiei}
          vestiti={vestitiGrandi(mioRuolo, { visti: vistiMiei, sbloccata, giorno })}
          elementi={giardino.elementi}
          bluPresenza={blu}
          momento={momento}
          mascotte={mascotte}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          onRiprendi={(v) => conConferma(() => riprendi(v))}
          onEsci={() => vai('home')}
          diario={diario(vistiMiei)}
          onRileggi={setRilettura}
          onPosta={() => setPostaAperta(true)}
          dettagli={archivio.dettagliFiori}
          nomi={{ [mioRuolo]: nomeMio, [altro(mioRuolo)]: nomePartner } as Record<Giocatore, string>}
        />
      )}
      {schermata === 'partita' && partita && (
        <Partita
          key={`partita-${partita.puzzle.modalita}-${partita.puzzle.seed}`}
          partita={partita}
          mioRuolo={mioRuolo}
          partnerNome={nomePartner}
          connessione={connessione}
          personaleConnesso={rete.personaleConnesso}
          partnerCursore={partnerCursore}
          mostraErrori={mostraErrori}
          vibrazione={vibrazione}
          onImpostazione={cambiaImpostazione}
          tema={tema}
          onTema={cambiaTema}
          onCancellaPartita={cancellaDallaPartita}
          sbloccata={sbloccata}
          mascotte={mascotte}
          chiacchiera={chiacchieraOra}
          battuta={battuta}
          onFerma={fermaBattute}
          onRiprendi={riprendiBattute}
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
          onSuggerimento={suggerisci}
          frasiDaScegliere={frasiDaScegliere}
          onEsci={() => vai('home')}
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
          elementi={giardino.elementi}
          bluPresenza={blu}
          momento={momento}
          vestiti={vestitiGrandi(mioRuolo, { visti: vistiMiei, sbloccata, giorno })}
          onNuova={() => iniziaNuova(partita.puzzle.modalita, partita.puzzle.livello)}
          onChiudi={() => setVittoriaChiusa(partita.iniziata)}
        />
      )}
      {cartaVai && !lettore && (
        <Vittoria
          secondi={cartaVai.secondi}
          frase={fraseVittoria?.iniziata === cartaVai.iniziata ? fraseVittoria.testo : ''}
          sbloccata={sbloccata}
          mascotte={mascotte}
          solletico={solleticoOra}
          onSolletico={onSolletico}
          puntiMiei={cartaVai.puntiMiei}
          puntiSuoi={cartaVai.puntiSuoi}
          bonus={cartaVai.bonus}
          fiori={fiori}
          elementi={giardino.elementi}
          bluPresenza={blu}
          momento={momento}
          vestiti={vestitiGrandi(mioRuolo, { visti: vistiMiei, sbloccata, giorno })}
          vai
          onNuova={() => {
            setCartaVai(null);
            if (ref.current.partita) vai('partita');
          }}
          onChiudi={() => setCartaVai(null)}
        />
      )}
      {postaAperta && (schermata === 'home' || schermata === 'giardino') && (
        <FoglioPosta
          posta={archivio.posta}
          mioRuolo={mioRuolo}
          nomePartner={nomePartner}
          sbloccata={sbloccata}
          onChiudi={() => setPostaAperta(false)}
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
            if (ref.current.partita) vai('partita');
          }}
          onChiudi={() => setDaConfermare(null)}
        />
      )}
      </div>
      {lettore?.chiedi && (
        <FoglioArretrati
          n={lettore.coda.length}
          onAdesso={() => setLettore(leggiAdesso(lettore))}
          onDopo={() => chiudiLettore(lettore)}
        />
      )}
      {capitoloAperto && lettore && (
        <CapitoloScena
          capitolo={capitoloAperto}
          indice={lettore.pos + 1}
          totale={lettore.coda.length}
          stadio={Math.min(4, capitoloAperto.fiore)}
          onContinua={continuaCapitolo}
          accessoriDisegnati={vestitoDisegnato}
          sfondo={sfondoDi(capitoloAperto)}
          esce={esce}
        />
      )}
      {rilettura !== null && !lettore && capitoloDi(rilettura) && (
        <CapitoloScena
          capitolo={capitoloDi(rilettura)!}
          stadio={Math.min(4, rilettura)}
          onContinua={chiudiRilettura}
          rilettura
          accessoriDisegnati={vestitoDisegnato}
          sfondo={sfondoDi(capitoloDi(rilettura)!)}
          esce={esce}
        />
      )}
      <Toasts attivi={attivi} onChiudi={chiudiToast} />
    </div>
  );
}

/** Prima di una coda lunga di capitoli dopo la vittoria: leggerli adesso o dopo (dalla Home). */
function FoglioArretrati({ n, onAdesso, onDopo }: { n: number; onAdesso: () => void; onDopo: () => void }) {
  const foglio = useRef<HTMLDivElement>(null);
  useDialogo(foglio);
  return (
    <div className="foglio-velo">
      <div ref={foglio} className="foglio" role="alertdialog" aria-modal="true" aria-labelledby="arretrati-titolo" data-testid="capitoli-chiedi">
        <div className="foglio-passo">
          <h2 id="arretrati-titolo">Hai {n} capitoli da leggere</h2>
          <p>Li leggi adesso? Se no restano qui, in ordine, e li trovi nella Home.</p>
          <div className="foglio-azioni">
            <button className="bottone" data-testid="capitoli-dopo" onClick={onDopo}>
              Dopo
            </button>
            <button className="bottone primario" data-testid="capitoli-adesso" autoFocus onClick={onAdesso}>
              Adesso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Conferma leggera prima di lasciare una partita iniziata per un'altra. */
function ConfermaNuova({ onNuova, onContinua, onChiudi }: { onNuova: () => void; onContinua: () => void; onChiudi: () => void }) {
  const foglio = useRef<HTMLDivElement>(null);
  const nuova = useRef<HTMLButtonElement>(null);
  useDialogo(foglio, true, { iniziale: nuova });
  return (
    <div className="foglio-velo" {...chiudiToccandoFuori(onChiudi)}>
      <div ref={foglio} className="foglio" role="alertdialog" aria-modal="true" aria-labelledby="conferma-nuova-titolo" data-testid="conferma-nuova">
        <div className="foglio-passo">
          <h2 id="conferma-nuova-titolo">Nuova partita?</h2>
          <p>La partita in corso resta nel giardino come germoglio.</p>
          <div className="foglio-azioni">
            <button className="bottone" data-testid="nuova-continua" onClick={onContinua}>
              Continua quella
            </button>
            <button ref={nuova} className="bottone primario" data-testid="nuova-conferma" onClick={onNuova}>
              Nuova
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
