// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Puzzle } from '../engine';
import { nuovaPartita } from '../stato';
import type { Cella, StatoPartita } from '../stato';
import { CELLA_INIZIALE, Griglia, cellaConFocus, etichettaCella } from './Griglia';
import { Menu, vociMenu } from './Menu';
import { Partita } from './Partita';
import { pila, useGestoIndietro } from './indietro';
import type { Mascotte } from './useMascotte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { __APP_VERSIONE__?: string }).__APP_VERSIONE__ = 'prova';

// una soluzione valida qualsiasi e un puzzle con le prime due righe vuote
const SOL = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  return ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
});
const PUZZLE: Puzzle = { modalita: 'sudoku', livello: 'facile', seed: 7, soluzione: SOL, dati: SOL.map((v, i) => (i < 18 ? 0 : v)) };
const cella = (v: number, da: 'a' | 'b', note: number[] = []): Cella => ({ v, note, da, ts: 1 });

let box: HTMLDivElement;
let root: Root;
beforeEach(() => {
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
  expect(pila.aperti).toBe(0);
});
const celle = () => Array.from(box.querySelectorAll<HTMLElement>('[role="gridcell"]'));
const tasto = (key: string, su: EventTarget = document.activeElement ?? window) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => void su.dispatchEvent(e));
  return e;
};

describe('griglia accessibile (T7.6): regole pure', () => {
  it('roving tabindex: la cella con Tab è la selezionata, se no quella centrale', () => {
    expect(cellaConFocus(12)).toBe(12);
    expect(cellaConFocus(0)).toBe(0);
    expect(cellaConFocus(null)).toBe(CELLA_INIZIALE);
  });
  it('etichetta: riga, colonna, valore e chi; vuota con le note; data; gabbia', () => {
    const base = { r: 2, c: 6, v: 0, data: false, errore: false, note: [], mia: null, nomePartner: 'Blu' };
    expect(etichettaCella(base)).toBe('riga 3, colonna 7, vuota');
    expect(etichettaCella({ ...base, note: [1, 4] })).toBe('riga 3, colonna 7, vuota, note 1 4');
    expect(etichettaCella({ ...base, v: 5, mia: false })).toBe('riga 3, colonna 7, 5, di Blu');
    expect(etichettaCella({ ...base, v: 5, mia: true, errore: true })).toBe('riga 3, colonna 7, 5, tuo, sbagliato');
    expect(etichettaCella({ ...base, v: 9, data: true })).toBe('riga 3, colonna 7, 9, dato');
    expect(etichettaCella({ ...base, somma: 14 })).toBe('riga 3, colonna 7, vuota, gabbia da 14');
  });
  it('prima di Semina il partner è "Blu" (il nome arriva da fuori), mai un nome inventato', () => {
    expect(etichettaCella({ r: 0, c: 0, v: 3, data: false, errore: false, note: [], mia: false })).toBe(
      'riga 1, colonna 1, 3, di chi gioca con te',
    );
  });
});

function griglia(sel: number | null, extra: Partial<Parameters<typeof Griglia>[0]> = {}) {
  return (
    <Griglia
      puzzle={PUZZLE}
      valori={PUZZLE.dati.map((v, i) => (i === 3 ? 5 : i === 4 ? 6 : v))}
      celle={{ 3: cella(5, 'b'), 4: cella(6, 'a'), 5: cella(0, 'a', [2, 7]) }}
      selezionata={sel}
      onSeleziona={() => {}}
      mostraErrori={false}
      mioRuolo="a"
      partnerCursore={null}
      lampo={null}
      arrivo={null}
      evidenziato={0}
      onDoppio={() => {}}
      sceltaRegalo={false}
      nomePartner="Blu"
      {...extra}
    />
  );
}

describe('griglia accessibile (T7.6): DOM', () => {
  it('grid → 9 row → 81 gridcell, una sola con tabIndex 0 (la selezionata) e aria-selected', () => {
    act(() => root.render(griglia(12)));
    expect(box.querySelector('[role="grid"]')).not.toBeNull();
    expect(box.querySelectorAll('[role="row"]').length).toBe(9);
    const cs = celle();
    expect(cs.length).toBe(81);
    expect(cs.filter((c) => c.tabIndex === 0).map((c) => cs.indexOf(c))).toEqual([12]);
    expect(cs.filter((c) => c.getAttribute('aria-selected') === 'true').map((c) => cs.indexOf(c))).toEqual([12]);
    act(() => root.render(griglia(null)));
    expect(celle().filter((c) => c.tabIndex === 0).map((c) => celle().indexOf(c))).toEqual([CELLA_INIZIALE]);
  });

  it('etichette utili: chi ha scritto e le note', () => {
    act(() => root.render(griglia(null)));
    const cs = celle();
    expect(cs[3].getAttribute('aria-label')).toBe('riga 1, colonna 4, 5, di Blu');
    expect(cs[4].getAttribute('aria-label')).toBe('riga 1, colonna 5, 6, tuo');
    expect(cs[5].getAttribute('aria-label')).toBe('riga 1, colonna 6, vuota, note 2 7');
    expect(cs[20].getAttribute('aria-label')).toBe(`riga 3, colonna 3, ${SOL[20]}, dato`);
  });

  it('il focus del DOM segue la selezione se la tastiera è sulla griglia', () => {
    act(() => root.render(griglia(12)));
    celle()[12].focus();
    act(() => root.render(griglia(13)));
    expect(document.activeElement).toBe(celle()[13]);
  });

  it('non ruba il focus a un bottone fuori dalla griglia', () => {
    const fuori = document.createElement('button');
    document.body.append(fuori);
    fuori.focus();
    act(() => root.render(griglia(12)));
    act(() => root.render(griglia(13)));
    expect(document.activeElement).toBe(fuori);
    fuori.remove();
  });

  it('Tab che entra in una cella la seleziona; un tocco no (la selezione la fa già il tocco)', () => {
    const onFocalizza = vi.fn();
    const onSeleziona = vi.fn();
    act(() => root.render(griglia(null, { onFocalizza, onSeleziona })));
    act(() => celle()[CELLA_INIZIALE].focus());
    expect(onFocalizza).toHaveBeenCalledWith(CELLA_INIZIALE);
    onFocalizza.mockClear();
    const c = celle()[7];
    act(() => {
      c.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      c.focus();
    });
    expect(onSeleziona).toHaveBeenCalledWith(7);
    expect(onFocalizza).not.toHaveBeenCalled();
  });
});

describe('menù unico (T7.7): voci per contesto', () => {
  it('Home: impostazioni, memoria, cancella (se c’è una partita), ricomincia, diagnostica', () => {
    expect(vociMenu('home', { inCorso: true })).toEqual(['impostazioni', 'memoria', 'cancella', 'ricomincia', 'diagnostica']);
    expect(vociMenu('home', { inCorso: false })).toEqual(['impostazioni', 'memoria', 'ricomincia', 'diagnostica']);
  });
  it('Partita: torna alla Home in cima, impostazioni (col tema), cancella; niente memoria né ricomincia', () => {
    expect(vociMenu('partita', { inCorso: true })).toEqual(['torna', 'impostazioni', 'cancella', 'diagnostica']);
    expect(vociMenu('partita', { inCorso: false })).toEqual(['torna', 'impostazioni', 'diagnostica']);
  });
});

/** Il menù con il gesto indietro montato (come in App), per provare Esc. */
function ConIndietro({ children }: { children: React.ReactNode }) {
  useGestoIndietro(() => ({ schermata: 'home', entrato: true, bloccato: false }), () => {});
  return <>{children}</>;
}
const props = {
  mostraErrori: true,
  vibrazione: false,
  tema: 'auto' as const,
  inCorso: true,
  sbloccata: false,
  onImpostazione: () => {},
  onTema: () => {},
  onCancellaPartita: () => {},
};
const q = (sel: string) => box.querySelector<HTMLElement>(sel);
const testi = () => Array.from(box.querySelectorAll('[role="menu"] [role^="menuitem"]')).map((e) => e.closest('label')?.textContent?.trim() || e.textContent?.trim());

describe('menù unico (T7.7) e accessibile (T7.6): DOM', () => {
  it('in Home: role=menu con menuitem, menuitemcheckbox e menuitemradio; il focus entra sulla prima voce', () => {
    act(() => root.render(<ConIndietro><Menu contesto="home" {...props} onEsporta={() => {}} onImporta={() => {}} onRicomincia={() => {}} /></ConIndietro>));
    const b = q('[data-testid="menu"]')!;
    b.focus();
    act(() => b.click());
    const m = q('[role="menu"]')!;
    expect(m.dataset.contesto).toBe('home');
    expect(m.querySelectorAll('[role="menuitemcheckbox"]').length).toBe(2);
    expect(m.querySelectorAll('[role="menuitemradio"]').length).toBe(3);
    expect(testi()).toContain('Esporta memoria');
    expect(testi()).toContain('Ricomincia da zero');
    expect(testi()).not.toContain('Torna alla Home');
    expect(document.activeElement).toBe(m.querySelector('[role="menuitemcheckbox"]'));
  });

  it('in partita: "Torna alla Home" in cima, tema e "Cancella la partita in corso"', () => {
    const onEsci = vi.fn();
    act(() => root.render(<ConIndietro><Menu contesto="partita" {...props} onEsci={onEsci} /></ConIndietro>));
    act(() => q('[data-testid="menu"]')!.click());
    const t = testi();
    expect(t[0]).toBe('Torna alla Home');
    expect(t).toContain('Cancella la partita in corso');
    expect(t).toEqual(expect.arrayContaining(['auto', 'notte', 'mattina']));
    expect(t).not.toContain('Esporta memoria');
    expect(t).not.toContain('Ricomincia da zero');
    expect(document.activeElement?.textContent).toBe('Torna alla Home');
    act(() => q('[data-testid="menu-torna"]')!.click());
    expect(onEsci).toHaveBeenCalledTimes(1);
    expect(q('[role="menu"]')).toBeNull();
  });

  it('frecce: su e giù tra le voci, in tondo; Fine e Inizio', () => {
    act(() => root.render(<ConIndietro><Menu contesto="partita" {...props} /></ConIndietro>));
    act(() => q('[data-testid="menu"]')!.click());
    const voci = Array.from(box.querySelectorAll<HTMLElement>('[role="menu"] [role^="menuitem"]'));
    tasto('ArrowDown');
    expect(document.activeElement).toBe(voci[1]);
    tasto('ArrowUp');
    tasto('ArrowUp');
    expect(document.activeElement).toBe(voci[voci.length - 1]);
    tasto('Home');
    expect(document.activeElement).toBe(voci[0]);
    tasto('End');
    expect(document.activeElement).toBe(voci[voci.length - 1]);
  });

  it('Esc chiude il menù e il focus torna al ⋯', () => {
    act(() => root.render(<ConIndietro><Menu contesto="home" {...props} /></ConIndietro>));
    const b = q('[data-testid="menu"]')!;
    b.focus();
    act(() => b.click());
    expect(b.getAttribute('aria-expanded')).toBe('true');
    tasto('Escape');
    expect(q('[role="menu"]')).toBeNull();
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(b);
  });

  it('cancella: la conferma prende il focus, Esc la chiude e torna al ⋯; "Cancella" chiama onCancellaPartita', () => {
    const onCancellaPartita = vi.fn();
    act(() => root.render(<ConIndietro><Menu contesto="partita" {...props} onCancellaPartita={onCancellaPartita} /></ConIndietro>));
    const b = q('[data-testid="menu"]')!;
    b.focus();
    act(() => b.click());
    act(() => q('[data-testid="menu-cancella"]')!.click());
    const f = q('[role="alertdialog"]')!;
    expect(f.contains(document.activeElement)).toBe(true);
    tasto('Escape');
    expect(q('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(b);
    act(() => b.click());
    act(() => q('[data-testid="menu-cancella"]')!.click());
    act(() => q('[data-testid="cancella-conferma"]')!.click());
    expect(onCancellaPartita).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(b);
  });
});

const MASCOTTE: Mascotte = { semino: { umore: 'neutro', impulso: 0 }, semina: { umore: 'neutro', impulso: 0 } } as Mascotte;
function partita(extra: Partial<Parameters<typeof Partita>[0]> = {}, p: StatoPartita = nuovaPartita(PUZZLE, 1)) {
  return (
    <ConIndietroPartita>
      <Partita
        partita={p}
        mioRuolo="a"
        partnerNome="Blu"
        connessione="connesso"
        personaleConnesso={false}
        partnerCursore={null}
        mostraErrori={false}
        vibrazione={false}
        onImpostazione={() => {}}
        tema="auto"
        onTema={() => {}}
        onCancellaPartita={() => {}}
        sbloccata={false}
        mascotte={MASCOTTE}
        chiacchiera={null}
        battuta={null}
        solletico={null}
        onSolletico={() => {}}
        onSuggerisci={() => false}
        onMossa={() => {}}
        onAnnulla={() => {}}
        puoAnnullare={false}
        onCursore={() => {}}
        onFrase={() => {}}
        frasiDaScegliere={() => ['una', 'due']}
        onEsci={() => {}}
        lampo={null}
        arrivo={null}
        {...extra}
      />
    </ConIndietroPartita>
  );
}
function ConIndietroPartita({ children }: { children: React.ReactNode }) {
  useGestoIndietro(() => ({ schermata: 'partita', entrato: true, bloccato: false }), () => {});
  return <>{children}</>;
}
const selezionata = () => celle().findIndex((c) => c.getAttribute('aria-selected') === 'true');

describe('partita: tastiera, menù e fogli insieme', () => {
  beforeEach(() => {
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  });

  it('Tab nella griglia seleziona la cella centrale, le frecce spostano selezione e focus, Esc toglie la selezione', () => {
    act(() => root.render(partita()));
    act(() => celle()[CELLA_INIZIALE].focus());
    expect(selezionata()).toBe(CELLA_INIZIALE);
    tasto('ArrowRight');
    expect(selezionata()).toBe(41);
    expect(document.activeElement).toBe(celle()[41]);
    tasto('ArrowUp');
    expect(selezionata()).toBe(32);
    expect(celle()[32].tabIndex).toBe(0);
    tasto('Escape');
    expect(selezionata()).toBe(-1);
  });

  it('con il menù aperto: le frecce girano tra le voci (non la griglia), Esc chiude il menù e la selezione resta', () => {
    const onMossa = vi.fn();
    act(() => root.render(partita({ onMossa })));
    act(() => celle()[10].focus());
    const b = box.querySelector<HTMLElement>('[data-testid="menu"]')!;
    b.focus();
    act(() => b.click());
    expect(box.querySelector('[role="menu"]')?.getAttribute('data-contesto')).toBe('partita');
    tasto('ArrowDown');
    expect(selezionata()).toBe(10);
    tasto('5');
    expect(onMossa).not.toHaveBeenCalled();
    tasto('Escape');
    expect(box.querySelector('[role="menu"]')).toBeNull();
    expect(selezionata()).toBe(10);
    expect(document.activeElement).toBe(b);
    // a menù chiuso la stessa cifra scrive nella cella selezionata
    tasto('5');
    expect(onMossa).toHaveBeenCalledWith(10, 5, []);
  });

  it('con il menù aperto e il focus finito sul body (clic su una parte non focalizzabile) le cifre non scrivono', () => {
    const onMossa = vi.fn();
    act(() => root.render(partita({ onMossa })));
    act(() => celle()[10].focus());
    act(() => box.querySelector<HTMLElement>('[data-testid="menu"]')!.click());
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    tasto('5', document.body);
    tasto('ArrowRight', document.body);
    expect(onMossa).not.toHaveBeenCalled();
    expect(selezionata()).toBe(10);
    tasto('Escape', document.body);
    expect(box.querySelector('[role="menu"]')).toBeNull();
    tasto('5', document.body);
    expect(onMossa).toHaveBeenCalledWith(10, 5, []);
  });

  it('il foglio delle frasi: focus dentro, Esc lo chiude e il focus torna al cuore', () => {
    act(() => root.render(partita()));
    const cuore = box.querySelector<HTMLElement>('[data-testid="manda-frase"]')!;
    cuore.focus();
    act(() => cuore.click());
    const f = box.querySelector('[data-testid="foglio-frasi"]')!;
    expect(f.contains(document.activeElement)).toBe(true);
    tasto('Escape');
    expect(box.querySelector('[data-testid="foglio-frasi"]')).toBeNull();
    expect(document.activeElement).toBe(cuore);
  });

  it('"Cancella la partita in corso" dal menù della partita chiama onCancellaPartita', () => {
    const onCancellaPartita = vi.fn();
    act(() => root.render(partita({ onCancellaPartita })));
    act(() => box.querySelector<HTMLElement>('[data-testid="menu"]')!.click());
    act(() => box.querySelector<HTMLElement>('[data-testid="menu-cancella"]')!.click());
    act(() => box.querySelector<HTMLElement>('[data-testid="cancella-conferma"]')!.click());
    expect(onCancellaPartita).toHaveBeenCalledTimes(1);
  });

  it('partita finita: nel menù niente "Cancella"', () => {
    act(() => root.render(partita({}, { ...nuovaPartita(PUZZLE, 1), finita: 2 })));
    act(() => box.querySelector<HTMLElement>('[data-testid="menu"]')!.click());
    expect(box.querySelector('[data-testid="menu-cancella"]')).toBeNull();
    expect(box.querySelector('[data-testid="menu-tema-scuro"]')).not.toBeNull();
  });
});
