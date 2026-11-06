# Report per Genna — notte del 06/11/2026

Online su https://genna-12.github.io/sudoku/ (banner "Aggiorna" su entrambi i telefoni). Chiusi i punti T7 rimasti: 6, 7, 9, 10. Il 12 ("Mati sta leggendo…") non l'ho fatto: tocca il protocollo di rete e un telefono aggiornato e uno no non si capirebbero durante il collaudo.

## Cosa è cambiato
- **Menù unico (⋯)**: è lo stesso pannello in Home e in Partita. In partita ha "Torna alla Home", mostra errori, vibrazione, tema e "Cancella la partita in corso". Esporta, importa e "Ricomincia da zero" restano solo in Home, perché durante una partita svuoterebbero lo schermo. A 360 px il menù scorre dentro di sé.
- **Esc e indietro**: Esc chiude menù e fogli come il gesto indietro di Android, nello stesso ordine. Quando un foglio si apre, il cursore ci entra, e quando si chiude torna dove era. Le cifre premute a menù aperto non scrivono più nella griglia (prima succedeva).
- **Griglia da tastiera e lettore di schermo**: si entra con Tab, ci si muove con le frecce, ogni cella dice riga, colonna, valore e chi l'ha messo. L'anello di selezione compare solo usando la tastiera.
- **La scena conosce l'ora**: il cielo di Home, Giardino e Vittoria cambia tra alba, giorno, crepuscolo e notte. Di giorno c'è il sole invece della luna. Se nel menù scegli il tema "notte" o "mattina", vince la tua scelta. Il lettore dei capitoli resta sempre di notte.
- **Vestiti dove i personaggi sono grandi**: Ingresso, Vittoria e Giardino mostrano gli stessi vestiti dell'ultima Home. Se intanto hai letto un capitolo nuovo, vincono quelli del capitolo. Prima del capitolo 5 nessuna traccia di Semina.

## Verifica fatta
Due implementatori in parallelo, poi un validatore separato. Il validatore ha corretto i tasti attivi a menù aperto e uno script E2E che falliva già prima. Il menù ha separatori tra i gruppi e sul telefono basso scorre. Risultati: 473 test unitari (prima 421) e tutti e 5 gli E2E verdi.

## Da provare sul telefono (lo stretto necessario)
1. **iPhone**: tocca le celle. Non deve comparire la tastiera e la pagina non deve scorrere.
2. **Android, dalla PWA installata**: col gesto indietro, prima si chiude il menù, poi si torna alla Home, poi si resta nell'app.
3. **Cielo**: guardalo all'alba o al tramonto e di giorno col telefono in modalità scura. Di giorno resta volutamente scuro: dimmi se ti piace o se il cielo deve schiarirsi anche lì.
4. Il collaudo T8 di prima resta valido: HANDOFF, "Da Genna".

## Rischi aperti (minori)
- In Home l'avviso "Frasi nuove…" copre la cima del menù se compaiono insieme.
- "Diagnostica rete" nel menù è grigia e rientrata (lo era già).
