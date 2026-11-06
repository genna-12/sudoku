// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu } from './Menu';
import { FoglioPosta } from './Posta';
import { pila, useGestoIndietro } from './indietro';
import { chiudiToccandoFuori } from './velo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { __APP_VERSIONE__?: string }).__APP_VERSIONE__ = 'prova';

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

const q = (sel: string) => box.querySelector<HTMLElement>(sel);
const evento = (su: Element, tipo: string) => act(() => void su.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true })));
/** un tocco: pressione e click sullo stesso elemento */
const tocca = (su: Element) => {
  evento(su, 'pointerdown');
  evento(su, 'pointerup');
  evento(su, 'click');
};

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

describe('velo che si chiude toccando fuori (H2)', () => {
  it('menù: alla sola pressione il velo resta (il click del tocco lo consuma lui), al click si chiude', () => {
    act(() => root.render(<ConIndietro><Menu contesto="home" {...props} /></ConIndietro>));
    act(() => q('[data-testid="menu"]')!.click());
    const velo = q('.menu-velo')!;
    evento(velo, 'pointerdown');
    expect(q('.menu-velo')).toBe(velo);
    expect(q('[role="menu"]')).not.toBeNull();
    evento(velo, 'click');
    expect(q('[role="menu"]')).toBeNull();
    expect(q('.menu-velo')).toBeNull();
  });

  it('conferma del menù: tocco sul velo chiude; pressione nel foglio e rilascio sul velo no', () => {
    act(() => root.render(<ConIndietro><Menu contesto="home" {...props} /></ConIndietro>));
    act(() => q('[data-testid="menu"]')!.click());
    act(() => q('[data-testid="menu-cancella"]')!.click());
    const velo = q('.foglio-velo')!;
    // si comincia dentro il foglio (es. selezionando testo) e si finisce fuori: il click va al velo
    evento(q('[role="alertdialog"] h2')!, 'pointerdown');
    evento(velo, 'click');
    expect(q('[role="alertdialog"]')).not.toBeNull();
    tocca(velo);
    expect(q('[role="alertdialog"]')).toBeNull();
  });

  it('Posta: tocco sul velo chiude, tocco dentro il foglio no', () => {
    const onChiudi = vi.fn();
    act(() =>
      root.render(
        <ConIndietro>
          <FoglioPosta posta={[]} mioRuolo="a" nomePartner="Blu" sbloccata={false} onChiudi={onChiudi} />
        </ConIndietro>,
      ),
    );
    tocca(q('[data-testid="foglio-posta"] h2')!);
    expect(onChiudi).not.toHaveBeenCalled();
    evento(q('.foglio-velo')!, 'pointerdown');
    expect(onChiudi).not.toHaveBeenCalled();
    evento(q('.foglio-velo')!, 'click');
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it('un click senza pressione sul velo (arrivato da un figlio) non chiude', () => {
    const chiudi = vi.fn();
    act(() =>
      root.render(
        <div data-testid="v" {...chiudiToccandoFuori(chiudi)}>
          <span data-testid="figlio">x</span>
        </div>,
      ),
    );
    evento(q('[data-testid="v"]')!, 'click');
    expect(chiudi).not.toHaveBeenCalled();
    tocca(q('[data-testid="figlio"]')!);
    expect(chiudi).not.toHaveBeenCalled();
    tocca(q('[data-testid="v"]')!);
    expect(chiudi).toHaveBeenCalledTimes(1);
  });
});
