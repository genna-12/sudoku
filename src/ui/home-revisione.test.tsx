// @vitest-environment jsdom
// Correzioni della revisione UI 06/11 nell'area Home (docs/revisione/correzioni-home.md).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home, Pallino } from './Home';
import type { Chiacchiera } from './Home';
import { Ingresso } from './Ingresso';
import { FoglioPosta } from './Posta';
import { pila, useGestoIndietro } from './indietro';
import { testoPallino } from './presenza';
import type { Mascotte } from './useMascotte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { __APP_VERSIONE__?: string }).__APP_VERSIONE__ = 'prova';

const MASCOTTE = { semino: { umore: 'neutro', impulso: 0 }, semina: { umore: 'neutro', impulso: 0 } } as Mascotte;
const nulla = () => {};
function home(extra: Partial<Parameters<typeof Home>[0]> = {}) {
  return (
    <Home
      nome="Genna"
      partnerNome="Verde"
      connessione="in-attesa"
      personaleConnesso={false}
      occupata={false}
      partita={null}
      mioRuolo="a"
      generando={false}
      fiori={3}
      sbloccata={false}
      giardino={{ elementi: [], bluPresenza: 0 }}
      giorno={null}
      visti={['capitolo-0', 'capitolo-1', 'capitolo-2', 'capitolo-3']}
      daLeggere={0}
      onLeggi={nulla}
      chiacchiera={null}
      solletico={null}
      onSolletico={nulla}
      mascotte={MASCOTTE}
      mostraErrori
      vibrazione={false}
      tema="auto"
      onImpostazione={nulla}
      onTema={nulla}
      onEsporta={nulla}
      onImporta={nulla}
      onCancellaPartita={nulla}
      onRicomincia={nulla}
      onContinua={nulla}
      onNuova={nulla}
      onGiardino={nulla}
      onCambia={nulla}
      {...extra}
    />
  );
}

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
});

describe('H4: testo del pallino breve in testata', () => {
  it('stanza occupata: breve "già collegato/a altrove", intero per lettore di schermo e title', () => {
    expect(testoPallino('in-attesa', 'Mati', true, false)).toEqual({
      breve: 'già collegato altrove',
      intero: 'sei già collegato da un altro dispositivo',
    });
    expect(testoPallino('in-attesa', 'Genna', true, true).breve).toBe('già collegata altrove');
  });
  it('errore: breve; gli altri stati restano quelli di sempre', () => {
    expect(testoPallino('errore', 'Mati').breve).toBe('non mi collego, riprovo');
    expect(testoPallino('in-attesa', 'Mati')).toEqual({ breve: 'aspetto Mati', intero: 'aspetto Mati' });
    expect(testoPallino('connesso', 'Mati').breve).toBe('Mati è qui');
  });
  it('DOM: il breve si vede, l’intero è nel title e nel testo nascosto', () => {
    act(() => root.render(<Pallino connessione="in-attesa" partner="Mati" occupata />));
    const p = box.querySelector<HTMLElement>('.pallino')!;
    expect(p.title).toBe('sei già collegato da un altro dispositivo');
    expect(p.querySelector('.pallino-testo')!.getAttribute('aria-hidden')).toBe('true');
    expect(p.querySelector('.nascosto-visivo')!.textContent).toBe('sei già collegato da un altro dispositivo');
    act(() => root.render(<Pallino connessione="connesso" partner="Mati" />));
    expect(box.querySelector('.pallino')!.getAttribute('title')).toBeNull();
    expect(box.querySelector('.nascosto-visivo')).toBeNull();
  });
});

const q = (sel: string) => box.querySelector<HTMLElement>(sel);

describe('H8: eco in Home, firma toccabile e fumetto che si chiude al tocco', () => {
  const eco: Chiacchiera = { id: 1, chi: 'semino', testo: 'Fiore 3 adesso si chiama Gino.', firma: 'Semino · dal capitolo 3', capitolo: 3 };

  it('la firma è un bottone che apre la rilettura di quel capitolo', () => {
    const onRileggi = vi.fn();
    act(() => root.render(home({ chiacchiera: eco, onRileggi })));
    const firma = q('[data-testid="eco-firma"]')!;
    expect(firma.tagName).toBe('BUTTON');
    expect(firma.getAttribute('aria-label')).toBe('Semino · dal capitolo 3: rileggi il capitolo');
    act(() => firma.click());
    expect(onRileggi).toHaveBeenCalledWith(3);
    // l'eco si è chiusa: torna il saluto
    expect(q('[data-testid="fumetto-eco"]')).toBeNull();
    expect(q('.fumetto-quieto')?.textContent).toContain('Ciao Genna');
  });

  it('toccare il fumetto lo chiude; una chiacchiera nuova si vede di nuovo', () => {
    act(() => root.render(home({ chiacchiera: eco, onRileggi: () => {} })));
    act(() => q('[data-testid="fumetto-eco"]')!.click());
    expect(q('[data-testid="fumetto-eco"]')).toBeNull();
    act(() => root.render(home({ chiacchiera: { ...eco, id: 2 }, onRileggi: () => {} })));
    expect(q('[data-testid="fumetto-eco"]')).not.toBeNull();
  });

  it('senza capitolo o senza onRileggi la firma resta testo', () => {
    act(() => root.render(home({ chiacchiera: { ...eco, capitolo: undefined }, onRileggi: () => {} })));
    expect(q('[data-testid="eco-firma"]')).toBeNull();
    expect(q('.fumetto-firma')?.tagName).toBe('SPAN');
  });
});

function ConIndietro({ children }: { children: React.ReactNode }) {
  useGestoIndietro(() => ({ schermata: 'home', entrato: true, bloccato: false }), () => {});
  return <>{children}</>;
}
const tasto = (key: string, su: Element = document.activeElement ?? document.body, shiftKey = false) =>
  act(() => void su.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })));

describe('H10: Posta, lista raggiungibile da tastiera', () => {
  it('la lista è focusabile (si scorre con le frecce) ed è nel giro del Tab con "Chiudi"', () => {
    const posta = Array.from({ length: 25 }, (_, i) => ({ ts: 1000 + i, da: (i % 2 ? 'a' : 'b') as 'a' | 'b', testo: `frase ${i}` }));
    act(() =>
      root.render(
        <ConIndietro>
          <FoglioPosta posta={posta} mioRuolo="a" nomePartner="Blu" sbloccata={false} onChiudi={() => {}} />
        </ConIndietro>,
      ),
    );
    const lista = q('.posta-lista')!;
    expect(lista.tabIndex).toBe(0);
    expect(lista.getAttribute('aria-label')).toBeTruthy();
    expect(document.activeElement).toBe(q('[data-testid="posta-chiudi"]'));
    // Chiudi è l'ultimo: Tab gira alla lista (la prima); Maiusc+Tab dalla lista torna a Chiudi
    tasto('Tab');
    expect(document.activeElement).toBe(lista);
    tasto('Tab', lista, true);
    expect(document.activeElement).toBe(q('[data-testid="posta-chiudi"]'));
    expect(pila.aperti).toBe(1);
  });
});

describe('H11: Ingresso, Invio senza colore', () => {
  it('lo dice sotto le card e porta il focus alla prima; scegliendo il colore il messaggio sparisce', () => {
    const onEntra = vi.fn();
    act(() => root.render(<Ingresso iniziale={null} sbloccata={false} onEntra={onEntra} />));
    const frase = q('[data-testid="frase"]') as HTMLInputElement;
    frase.focus();
    tasto('Enter', frase);
    expect(q('[data-testid="manca-colore"]')?.textContent).toBe('Scegli il tuo colore.');
    expect(q('[data-testid="manca-colore"]')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(q('[data-testid="scegli-semino"]'));
    act(() => q('[data-testid="scegli-semina"]')!.click());
    expect(q('[data-testid="manca-colore"]')).toBeNull();
    expect(onEntra).not.toHaveBeenCalled();
  });
});
