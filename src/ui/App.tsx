import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { COLORI, FRASI } from '../config/frasi';
import { generaPuzzle, verificaCompleta } from '../engine';
import type { Livello, Modalita } from '../engine';
import type { Messaggio } from '../net';
import { accettaNuova, applica, griglia, nuovaPartita, unisci } from '../stato';
import type { StatoPartita } from '../stato';
import type { Arrivo, Lampo } from './Griglia';
import { Home } from './Home';
import { Ingresso } from './Ingresso';
import { Partita } from './Partita';
import { Toasts, useToasts } from './Toasts';
import { useStanza } from './useStanza';
import type { Io } from './useStanza';
import { CHIAVI, altro, caso, conNome, gruppi, leggi, scrivi } from './util';
import { Vittoria } from './Vittoria';

type Schermata = 'ingresso' | 'home' | 'partita';
interface Passo {
  idx: number;
  v: number;
  note: number[];
}

function partitaSalvata(): StatoPartita | null {
  const p = leggi<StatoPartita>(CHIAVI.partita);
  return p && p.puzzle && Array.isArray(p.puzzle.dati) ? p : null;
}

export function App() {
  const [io, setIo] = useState<Io | null>(() => leggi<Io>(CHIAVI.io));
  const [partita, setPartita] = useState<StatoPartita | null>(partitaSalvata);
  const partitaRef = useRef(partita);
  const [schermata, setSchermata] = useState<Schermata>(() =>
    !io ? 'ingresso' : partita && !partita.finita ? 'partita' : 'home',
  );
  const [partnerNome, setPartnerNome] = useState(() => leggi<string>(CHIAVI.partner) ?? '');
  const [mostraErrori, setMostraErrori] = useState(() => leggi<boolean>(CHIAVI.errori) ?? true);
  const [partnerCursore, setPartnerCursore] = useState<number | null>(null);
  const [lampo, setLampo] = useState<Lampo | null>(null);
  const [arrivo, setArrivo] = useState<Arrivo | null>(null);
  const [generando, setGenerando] = useState(false);
  const [vittoriaChiusa, setVittoriaChiusa] = useState<number | null>(null);
  const passi = useRef<Passo[]>([]);
  const [nPassi, setNPassi] = useState(0);
  const ultimoArrivo = useRef(0);
  const { attivi, mostra } = useToasts();

  /** Unico punto in cui cambia la partita: controlla la vittoria e tiene allineato il ref. */
  const aggiorna = useCallback((n: StatoPartita | null) => {
    if (n && !n.finita && verificaCompleta(n.puzzle, griglia(n))) {
      n = applica(n, { tipo: 'finita', ts: Date.now() });
    }
    partitaRef.current = n;
    setPartita(n);
  }, []);

  const azzeraPassi = useCallback(() => {
    passi.current = [];
    setNPassi(0);
  }, []);

  useEffect(() => {
    scrivi(CHIAVI.partita, partita);
  }, [partita]);

  // --- rete ---------------------------------------------------------------
  const nomePartnerRef = useRef(partnerNome);
  useEffect(() => {
    nomePartnerRef.current = partnerNome;
  }, [partnerNome]);

  const suMessaggio = (m: Messaggio) => {
    const mia = partitaRef.current;
    switch (m.t) {
      case 'ciao': {
        if (m.nome) salvaPartner(m.nome);
        const unita = m.stato ? (mia ? unisci(mia, m.stato) : m.stato) : mia;
        if (unita && unita !== mia) {
          if (!mia || unita.puzzle.seed !== mia.puzzle.seed) {
            azzeraPassi();
            setPartnerCursore(null);
          }
          aggiorna(unita);
        }
        if (unita) invia({ t: 'stato', stato: unita });
        break;
      }
      case 'stato': {
        const unita = mia ? unisci(mia, m.stato) : m.stato;
        if (unita !== mia) {
          if (!mia || unita.puzzle.seed !== mia.puzzle.seed) {
            azzeraPassi();
            setPartnerCursore(null);
          }
          aggiorna(unita);
        }
        break;
      }
      case 'cella': {
        if (!mia) break;
        // mossa fatta sulla partita precedente, arrivata dopo una "nuova": non va sulla griglia nuova
        if (m.ts <= mia.iniziata) break;
        const n = applica(mia, { tipo: 'cella', idx: m.idx, v: m.v, note: m.note, da: m.da, ts: m.ts });
        if (n !== mia) {
          aggiorna(n);
          setArrivo({ id: Date.now(), idx: m.idx });
        }
        break;
      }
      case 'nuova': {
        if (!accettaNuova(mia, m.stato)) {
          // "nuova" incrociate: vince la mia (più recente); rimando lo stato così convergiamo
          if (mia) invia({ t: 'stato', stato: mia });
          break;
        }
        aggiorna(m.stato);
        azzeraPassi();
        setPartnerCursore(null);
        setVittoriaChiusa(null);
        setSchermata((s) => (s === 'ingresso' ? s : 'partita'));
        mostra({ tipo: 'banner', testo: `${nomePartnerRef.current || 'Mini'} ha iniziato una nuova partita` });
        break;
      }
      case 'cursore':
        setPartnerCursore(m.idx);
        break;
      case 'frase':
        mostra({ tipo: 'grande', testo: m.testo, firma: nomePartnerRef.current, colore: 'var(--suo)' });
        break;
    }
  };

  function salvaPartner(nome: string) {
    setPartnerNome(nome);
    scrivi(CHIAVI.partner, nome);
  }

  const { connessione, ruolo, invia } = useStanza(io, {
    statoCorrente: () => partitaRef.current,
    messaggio: suMessaggio,
    partner: (nome) => {
      salvaPartner(nome);
      if (Date.now() - ultimoArrivo.current > 15000) {
        ultimoArrivo.current = Date.now();
        mostra({ tipo: 'banner', testo: conNome(caso(FRASI.arrivo), nome) });
      }
    },
  });
  // Il colore di ciascuno deve restare lo stesso da una partita all'altra: lo decidono i nomi
  // (ordine alfabetico), non chi si è collegato per primo. Il ruolo di rete serve solo se i nomi
  // coincidono o il partner non è ancora noto. Il nome del partner è salvato in localStorage,
  // quindi dalla seconda apertura in poi è noto fin dall'avvio.
  const mioNome = io?.nome ?? '';
  const mioRuolo: 'a' | 'b' =
    partnerNome && partnerNome !== mioNome
      ? mioNome.localeCompare(partnerNome, 'it') <= 0
        ? 'a'
        : 'b'
      : (ruolo ?? 'a');

  // partner andato via: il suo cursore non deve restare acceso sulla griglia
  useEffect(() => {
    if (connessione !== 'connesso') setPartnerCursore(null);
  }, [connessione]);

  // --- timer ----------------------------------------------------------------
  const inGioco = schermata === 'partita' && !!partita && !partita.finita;
  useEffect(() => {
    if (!inGioco) return;
    const t = window.setInterval(() => {
      const p = partitaRef.current;
      if (p && document.visibilityState === 'visible') aggiorna(applica(p, { tipo: 'tick' }));
    }, 1000);
    return () => window.clearInterval(t);
  }, [inGioco, aggiorna]);

  // --- mosse ----------------------------------------------------------------
  function mossa(idx: number, v: number, note: number[], daAnnulla = false) {
    const p = partitaRef.current;
    if (!p || p.finita || p.puzzle.dati[idx] !== 0) return;
    const prec = p.celle[idx];
    // ts sempre dopo `iniziata`: l'altro scarta le mosse con ts <= iniziata (residui di partite vecchie)
    const ts = Math.max(Date.now(), (prec?.ts ?? 0) + 1, p.iniziata + 1);
    const n = applica(p, { tipo: 'cella', idx, v, note, da: mioRuolo, ts });
    if (n === p) return;
    if (!daAnnulla) {
      passi.current.push({ idx, v: prec?.v ?? 0, note: prec?.note ?? [] });
      if (passi.current.length > 200) passi.current.shift();
      setNPassi(passi.current.length);
    }
    aggiorna(n);
    invia({ t: 'cella', idx, v, note, da: mioRuolo, ts });
    if (!daAnnulla && v !== 0 && v !== (prec?.v ?? 0)) reazione(n, idx, v);
  }

  function reazione(n: StatoPartita, idx: number, v: number) {
    const sol = n.puzzle.soluzione;
    const el = document.querySelector(`[data-testid="cella-${idx}"]`);
    const r = el?.getBoundingClientRect();
    const margine = Math.min(90, window.innerWidth / 2);
    const posto = r
      ? { x: Math.min(Math.max(r.left + r.width / 2, margine), window.innerWidth - margine), y: r.top }
      : { x: window.innerWidth / 2, y: window.innerHeight / 3 };
    if (v !== sol[idx]) {
      if (mostraErrori) mostra({ tipo: 'piccolo', testo: caso(FRASI.sbagliata), colore: 'var(--errore)', ...posto });
      return;
    }
    const vals = griglia(n);
    const fatti = Object.values(gruppi(idx)).filter((g) => g.every((i) => vals[i] === sol[i]));
    if (fatti.length) {
      setLampo({ id: Date.now(), centro: idx, celle: [...new Set(fatti.flat())] });
      mostra({ tipo: 'piccolo', testo: caso(FRASI.completato), colore: 'var(--evid)', ...posto });
    } else if (Math.random() < 0.25) {
      mostra({ tipo: 'piccolo', testo: caso(FRASI.giusta), colore: 'var(--mio)', ...posto });
    }
  }

  function annulla() {
    const passo = passi.current.pop();
    setNPassi(passi.current.length);
    if (passo) mossa(passo.idx, passo.v, passo.note, true);
  }

  const onCursore = useCallback((idx: number | null) => invia({ t: 'cursore', idx }), [invia]);

  function mandaFrase() {
    if (connessione !== 'connesso') {
      mostra({ tipo: 'banner', testo: 'Non c’è nessuno nella stanza: la frase non è partita' });
      return;
    }
    const testo = caso(FRASI.invio);
    invia({ t: 'frase', testo });
    mostra({ tipo: 'banner', testo: `Mandata: ${testo}` });
  }

  function iniziaNuova(m: Modalita, l: Livello) {
    setGenerando(true);
    // un giro di pausa così il bottone mostra "preparo la griglia" prima del calcolo
    window.setTimeout(() => {
      try {
        const st = nuovaPartita(generaPuzzle(m, l, Date.now()));
        aggiorna(st);
        azzeraPassi();
        setPartnerCursore(null);
        setVittoriaChiusa(null);
        invia({ t: 'nuova', stato: st });
        setSchermata('partita');
      } finally {
        setGenerando(false);
      }
    }, 30);
  }

  function entra(nuovo: Io) {
    scrivi(CHIAVI.io, nuovo);
    setIo(nuovo);
    setSchermata('home');
  }

  function cambiaErrori(v: boolean) {
    setMostraErrori(v);
    scrivi(CHIAVI.errori, v);
  }

  const finita = partita?.finita;
  const fraseVittoria = useMemo(() => (finita ? caso(FRASI.vittoria) : ""), [finita]);
  const vittoria = schermata === 'partita' && partita?.finita && vittoriaChiusa !== partita.iniziata;

  const stile = {
    '--mio': COLORI[mioRuolo],
    '--suo': COLORI[altro(mioRuolo)],
  } as CSSProperties;

  return (
    <div className="app" style={stile}>
      {schermata === 'ingresso' && <Ingresso key="ingresso" iniziale={io} onEntra={entra} />}
      {schermata === 'home' && io && (
        <Home
          key="home"
          nome={io.nome}
          partnerNome={partnerNome}
          connessione={connessione}
          partita={partita}
          mioRuolo={mioRuolo}
          generando={generando}
          onContinua={() => setSchermata('partita')}
          onNuova={iniziaNuova}
          onCambia={() => setSchermata('ingresso')}
        />
      )}
      {schermata === 'partita' && partita && (
        <Partita
          key="partita"
          partita={partita}
          mioRuolo={mioRuolo}
          partnerNome={partnerNome}
          connessione={connessione}
          partnerCursore={partnerCursore}
          mostraErrori={mostraErrori}
          onErrori={cambiaErrori}
          onMossa={mossa}
          onAnnulla={annulla}
          puoAnnullare={nPassi > 0 && !partita.finita}
          onCursore={onCursore}
          onFrase={mandaFrase}
          onEsci={() => setSchermata('home')}
          lampo={lampo}
          arrivo={arrivo}
        />
      )}
      {vittoria && partita && (
        <Vittoria
          secondi={partita.secondi}
          frase={fraseVittoria}
          onNuova={() => iniziaNuova(partita.puzzle.modalita, partita.puzzle.livello)}
          onChiudi={() => setVittoriaChiusa(partita.iniziata)}
        />
      )}
      <Toasts attivi={attivi} />
    </div>
  );
}
