# Ambienti dei capitoli 9-100: momento, meteo, comparse, oggetti

Data: 2026-11-11. Traguardo T9, parte C2. Formato e regole vincolanti: `docs/specs/T9-C-ambienti.md`; partenza: `docs/storia/inventario-comparse.md`.

Scopo: dare a ogni capitolo dal 9 al 100 un'ora del giorno, un tempo, poche creature di sfondo e qualche oggetto, perché la scena sia viva e torni con la storia letta una sera dopo l'altra. Le righe stanno in `capitoli.md`, subito dopo `@elemento:`; questo file è il vocabolario chiuso (fa fede per `controlla.py` e `src/config/ambienti.ts`) e il registro delle scelte.

## Regole usate

- Valori: `momento` = alba, mattina, giorno, tramonto, sera, notte; `meteo` = sereno, nuvole, vento, pioggia, temporale, nebbia, neve. Al massimo 3 comparse e 3 oggetti per capitolo; vuoto ammesso. I capitoli 0-8 non hanno queste righe.
- Dove il testo dice l'ora o il tempo (battute, `narra`, eco) si segue alla lettera. "Crepuscolo" vale `tramonto`; "pomeriggio" e "mezzogiorno" valgono `giorno`.
- Se il testo dice due ore (un salto nella nota finale: 9, 10, 14, 36, 53), il cielo è quello della scena in cui si parla.
- Dove il testo tace, l'ora segue il giorno del luogo (un capitolo dopo l'altro, senza tornare indietro dentro la stessa giornata) e il tempo cambia solo con un motivo (vento che porta nuvole, pioggia che lascia nuvole, nebbia del mattino). Le scelte servono l'umore del capitolo senza dirlo.
- Le eco non si contraddicono: per esempio al 32 l'eco dice "sereno dappertutto, tranne in un punto", quindi il cielo è sereno e la nuvoletta è solo quella che la mascotte arrabbiata ha già sopra la testa.
- Comparse: creature senza nome e senza battute, citate nel testo o tipiche del luogo, mai dove il testo le esclude (al 46 "le lucciole non vengono", al 52 "non vedo"). Dal 94 è inverno: niente farfalle.
- Oggetti: si elencano se nel capitolo stanno posati da qualche parte o passano di mano. Non si elencano quelli che il testo tiene addosso o in mano alla stessa persona dall'inizio alla fine (lo zaino in spalla, il nodo sulla cinghia al 90, il foglio in mano al 86): disegnati per terra racconterebbero un'altra cosa.
- Un oggetto lasciato in scena resta nei capitoli dopo, se il luogo è lo stesso e c'è posto (la tavola sul muretto 26-27, l'ombrellone 23-24, la pianta sul tavolo della cucina dal 69, la lettera sotto il piatto 77-87).
- Non si ripete ciò che è già disegnato: nel giardino la Scena della Home porta già cassetta, stagno, merlo, tavola sul muretto, sasso di quota, lanterna appesa, chitarra, locandina, casetta, cartina, arcobaleno; i fondali hanno già muretto (mare), baita e neve sulle cime (montagna), tronchi e lucciole (bosco), lampioni e fili del tram (città), finestre, frigo e tavolo (cucina). Anche i vestiti disegnano qualcosa (la tavola con `surf`, la palla con `palla`, la lanterna con `lanterna`, la conchiglia al collo con `paglia`): lì l'oggetto non si aggiunge.

## Vocabolario

### Comparse (10)

| id | come si disegna | capitoli |
|---|---|---|
| `lucciole` | tre-cinque puntini giallo caldo con un alone morbido, ognuno grande come un'unghia di mascotte; galleggiano piano e si accendono a turno. Il Fondale del bosco ne ha già di suoi (vedi Punti dubbi). | 43-44, 48, 53 |
| `granchi` | tre-quattro granchietti corallo spento, larghi un terzo della testa di una mascotte, più piccoli e più semplici di Pinza (niente occhi a stelo marcati); sugli scogli, ogni tanto uno fa due passi di lato. | 21 |
| `gabbiani` | due sagome a "m" morbida, bianco sporco, lontane nel cielo sopra l'orizzonte (non sotto la nota del narratore); planano in un cerchio lento. | 15-18, 23-24, 27 |
| `rane` | una o due ranocchie verde salvia (non verde fluo), alte mezza testa di mascotte, sul bordo dello stagno; ogni tanto gonfiano la gola. | 13, 91 |
| `farfalle` | due farfalline crema e pesca, minuscole, basse sul prato; volo a zigzag lento. | 12, 29-30 |
| `marmotta` | marmotta color sabbia, alta come mezza mascotte, lontana sul prato; sbuca dalla tana, si alza dritta e torna giù. | 28, 31, 41 |
| `scoiattolo` | scoiattolo rossiccio con la coda a ricciolo, piccolo, su un ramo o sul tronco di fondo; muove la coda a scatti. | 45, 51 |
| `tram` | tram crema e petrolio con due finestrini accesi e un muso tondo (Semina lo tratta da animale), piccolo per la distanza, sui fili del fondale; scorre lento da un lato all'altro. | 55, 58, 61, 65 |
| `falene` | tre puntini grigio crema che girano stretti attorno al lampione del fondale. | 55, 59, 66 |
| `piccione` | piccione grigio ardesia col collo cangiante petrolio, una zampa rosa e una grigia (così vale anche per Semino Tre al 64), alto mezza mascotte, a terra; becchetta e fa due passi. | 64, 80, 90 |

### Oggetti (30)

Tutti piccoli, nel palco o nel fondale, mai sopra le mascotte o il fumetto. Le misure sono rispetto a una mascotte in piedi.

| id | come si disegna | capitoli |
|---|---|---|
| `zaino` | zainetto da escursione ocra con la patta più scura, alto mezza mascotte, posato a terra o appeso (sella, porta); mai indossato: addosso lo disegnano i vestiti. | 27, 32-33, 54, 57, 65, 84, 94 |
| `tavola` | tavola da surf crema con una riga petrolio, dritta in verticale contro il muretto, poco più alta di una mascotte; graffiate sopra una montagna e un'onda piccola. | 26-27, 92 |
| `ombrellone` | ombrellone a spicchi crema e petrolio piantato nella sabbia, in fondale, con un'ombra lunga a terra che punta al muretto. | 23-24 |
| `conchiglia` | conchiglia a ventaglio rosa pallido con un forellino, grande come il pugno di una mascotte, posata a terra o in cima a un ometto di sassi. | 19, 24, 37 |
| `palla` | la palla da pallanuoto gialla coi solchi blu del vestito `palla`, con una toppa di nastro bianco a croce (si usa solo dopo il 22); a terra, rotola di un niente. | 59, 75, 99 |
| `pc` | portatile aperto grigio scuro con un bagliore azzurrino sullo schermo, grande come una mascotte seduta; il cursore lampeggia. | 9, 44, 47, 53, 58, 61, 64 |
| `sasso-misura` | sasso piatto grigio chiaro, ovale, piantato tra le radici, con il numero scritto a mano che si legge, come nel testo: 40 al 13, 39 al 14 e al 91, 38 al 95 e al 100 (corretto in C3). | 13-14, 91, 95, 100 |
| `bastoncino` | rametto dritto marrone chiaro con tre tacche, lungo come una mascotte, appoggiato al sasso o per terra. | 14, 91, 95, 100 |
| `sasso-quota` | il sasso di quota: stesso disegno dell'elemento `sasso` della Scena, più piccolo, posato a terra o sul tavolo. | 37, 71 |
| `cartina` | foglio di carta beige aperto con due linee a matita e una macchiolina (al 29 è la mappa dei sentieri con la marmellata, dal 88 la cartina a due strade): a terra o sul tavolo. | 29, 88-89, 98 |
| `matita` | matita rossa corta, lunga quanto una mano di mascotte, posata sul tavolo accanto alla cartina; rotola di un millimetro. | 88-89, 98 |
| `carrucola` | ruota di legno su un palo accanto alla baita, con una corda che scende fuori quadro verso valle; la ruota gira piano. | 34, 41, 83 |
| `secchio` | secchio di latta grigio azzurro col manico, alto un terzo di mascotte, a terra o appeso alla corda della carrucola. | 34, 83, 92 |
| `nodo` | pezzo di corda color canapa con un nodo grosso in mezzo, posato a terra o sul sedile. | 41, 84 |
| `cappello` | cappellino da sole di Semina, a tesa morbida color sabbia con un nastro blu sottile, posato a tesa in giù (capovolto come vuole il 38). | 36, 38 |
| `tazze` | due tazze crema, una con un filo di vapore che sale lento (al 39 e al 69 basta una). | 38-39, 69-71, 94 |
| `pianta` | piantina di tre-quattro foglie verde salvia in un bicchiere, piccola, sul tavolo della cucina; le foglie oscillano appena. | 69-78, 82, 85-89 |
| `piatto` | piatto bianco con un ciuffo di pasta al pomodoro, piccolo, posato; quando c'è anche `lettera` (77-87) la lettera spunta da sotto il piatto. | 11, 73, 77-78, 85, 87, 99 |
| `lettera` | una o più lettere bianche piegate, con un angolo che spunta; posate (tavolo, sedile, a terra). | 12, 51, 77-78, 84-85, 87, 93 |
| `foglio` | foglio bianco con due-tre righe a matita (scarabocchi grigi), posato. | 49, 73, 82, 93 |
| `piuma` | piuma grigia posata sul ramo (nel bosco sdraiata sul ramo, sopra il posto dei fumetti) o a terra, ondeggia appena. | 44-45, 54, 96 |
| `bacca` | bacca rossa tonda con una fogliolina, accanto alla piuma sul ramo basso. | 45, 96 |
| `fuochi` | due-tre fuochi d'artificio a raggiera nel cielo (oro, rosa, bianco) che si aprono e svaniscono lenti; si può riusare il disegno `fuochi` della Scena. | 50 |
| `custodia` | custodia di chitarra aperta per terra, marrone scuro con l'interno petrolio e due-tre monete. | 56, 62, 97 |
| `plettro` | plettro giallo minuscolo, mangiato su un lato; al 62 vicino a chi lo riceve, al 81 sul banco sotto un rettangolino trasparente. | 62, 81 |
| `locandina` | foglio crema rettangolare con scritte storte, attaccato al muro con un nastro; un angolo si solleva. | 65 |
| `vetrino` | vetrino rotto: due metà di un rettangolino trasparente azzurrino, accostate su un foglio o un fazzoletto. | 82 |
| `mela` | mela rossa col picciolo e una foglia verde salvia; al 86 sono due, vicine. | 81, 86 |
| `fiore-cima` | fiorellino di montagna bianco grigio a stella, piccolo e un po' piegato (va bene fresco al 33 e secco al 75). | 33, 75 |
| `biscotti` | due biscotti tondi dorati, al bordo dell'aiuola. | 100 |

## Continuità per atto

"(t)" accanto a momento o meteo vuol dire che lo dice il testo (o lo implica in modo chiaro, come nell'inventario); senza segno è una scelta. La nota dice il perché; tra virgolette le parole del testo.

### Atto 1 · giardino (9-14)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 9 | Il patto delle ore | sera (t) | sereno | — | pc | «Sera.»; il salto alle 4:10 è nella nota finale |
| 10 | Fischio | alba | sereno | — | — | Fischio canta alle sei, Semino ha appena chiuso alle quattro |
| 11 | Pasta | tramonto | sereno | — | piatto | cena sul fuoco di rametti, luce calda per il gesto |
| 12 | La cassetta | giorno (t) | sereno | farfalle | lettera | «prima di sera»: pomeriggio; giornata qualunque, leggera |
| 13 | Forse | giorno | nuvole | rane | sasso-misura | nuvole leggere per un «forse»; le rane dello stagno |
| 14 | Un centimetro | alba (t) | nuvole | — | sasso-misura, bastoncino | «Alba.» (gesto di lei); nuvole: «se piove, resta» |

### Atto 2 · mare (15-27)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 15 | Onde | giorno | sereno | gabbiani | — | arrivo al mare, capitolo di viaggio leggero |
| 16 | La tavola | giorno | sereno | gabbiani | — | lezione di surf: serve luce piena |
| 17 | Pinza | giorno (t) | sereno | gabbiani | — | eco: «tutto il pomeriggio» di lato |
| 18 | La riva | giorno | nuvole | gabbiani | — | lei si allontana: qualche nuvola, senza dirlo |
| 19 | La conchiglia | tramonto | sereno | — | conchiglia | lei torna verso sera; prepara la notte del 20 |
| 20 | Venti stelle | notte (t) | sereno (t) | — | — | «Notte sulla spiaggia», venti stelle in cielo |
| 21 | Quattordici granchi | mattina | sereno | granchi | — | dopo la notte delle stelle, i nomi all'ora di lei |
| 22 | La toppa | giorno | sereno | — | — | gag della palla in pieno giorno |
| 23 | L'ombra al muretto | giorno (t) | sereno (t) | gabbiani | ombrellone | l'ombra dell'ombrellone si sposta: pomeriggio di sole |
| 24 | La settima | giorno | sereno | gabbiani | ombrellone, conchiglia | stessa spiaggia del 23, l'ombrellone resta |
| 25 | Acqua che non sta ferma | sera (t) | vento | — | — | dormono alle dieci; vento: la sabbia nelle orecchie |
| 26 | La tavola sul muretto | mattina (t) | sereno | — | tavola | «Mattina.»; il vento della sera è calato |
| 27 | Una chela sola | mattina | sereno | gabbiani | tavola, zaino | si parte la stessa mattina; tavola sul muretto; lo zaino a cui Pinza si aggrappa (C3) |

### Atto 3 · montagna (28-42)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 28 | Lo zaino | mattina | sereno | marmotta | — | si parte in salita, capitolo di viaggio leggero |
| 29 | Ogni dieci passi | giorno (t) | sereno | farfalle | cartina | panini in cima: pranzo; la mappa sull'erba |
| 30 | Nuvola | giorno | sereno | farfalle | — | prato di giorno per l'arrivo di Nuvola |
| 31 | Quattro secondi | giorno | sereno | marmotta | — | gag della caduta: una marmotta guarda |
| 32 | Il temporale | mattina (t) | sereno (t) | — | zaino | «le dieci e cinque»; eco: sereno tranne su di lei |
| 33 | Sotto la roccia | mattina | nuvole | — | zaino, fiore-cima | venti minuti dopo; la nuvola è salita in cima |
| 34 | La carrucola | giorno | sereno | — | carrucola, secchio | la nuvola è passata, come dice Nonna Capra |
| 35 | Due sentieri | tramonto | sereno | — | — | «tre ombre sul sentiero»: ombre lunghe; l'alba segue; niente zaino a terra: Semino lo appende alla sella e ha lo zaino-storto (C3) |
| 36 | L'alba, una volta | alba (t) | sereno (t) | — | cappello | «Il sole esce da dietro la cima» |
| 37 | Il sasso di quota | giorno | vento (t) | — | sasso-quota, conchiglia | «Il vento gira»; stesso giorno dell'alba |
| 38 | Il cappello capovolto | tramonto | nuvole | — | cappello, tazze | il vento del 37 porta nuvole; tè alla baita |
| 39 | Letto male | sera | sereno | — | tazze | «ho sonno»: sera; il cielo si è aperto |
| 40 | La canzone della capra | sera (t) | sereno | — | — | «Sera.»; si sente la campanella da valle |
| 41 | In discesa | mattina | sereno | marmotta | nodo, carrucola | «Si parte»; la corda della carrucola col nodo |
| 42 | Nuvola resta | tramonto | sereno | — | — | eco «dritto da stamattina»; il bosco arriva di sera |

### Atto 4 · bosco (43-54)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 43 | L'ora in mezzo | sera | sereno | lucciole | — | tardi per lei, presto per lui; servono le lucciole |
| 44 | Gufo | notte (t) | sereno | lucciole | pc, piuma | «Notte fonda»; la piuma resta sul ramo |
| 45 | Lo stesso ramo | alba (t) | sereno | scoiattolo | piuma, bacca | «Alba.»: la piuma del 44 è ancora lì |
| 46 | Oggi no | sera | pioggia | — | — | fango fino alla vita, le lucciole non vengono |
| 47 | La riga | sera (t) | nuvole | — | pc | dopo la pioggia; le lucciole vanno a dormire |
| 48 | Sei mini | notte | sereno | lucciole | — | Gufo è sveglio e parla: notte |
| 49 | Una cosa al giorno | tramonto (t) | sereno | — | foglio | «Crepuscolo.» = tramonto |
| 50 | Fuochi | sera (t) | sereno | — | fuochi | «le nove di sera»; fuochi in cielo sereno |
| 51 | Posta | mattina | sereno | scoiattolo | lettera | Fischio porta la posta di giorno |
| 52 | Al buio | notte (t) | nuvole | — | — | nuvole senza luna: «Non vedo.» |
| 53 | Due letti | notte (t) | sereno | lucciole | pc | le dieci, le quattro: notte |
| 54 | Verso le luci | sera | sereno | — | piuma, zaino | le luci della città accese laggiù |

### Atto 5 · città (55-66)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 55 | Le luci | notte (t) | sereno | tram, falene | — | «Notte in città»; falene sui lampioni |
| 56 | Grillo | sera (t) | sereno | — | custodia | «Stasera la porto solo a spasso» |
| 57 | Il palco | sera (t) | sereno | — | zaino | il 65 dice «Ieri sera» del palco |
| 58 | Cinque minuti | notte (t) | sereno | tram | pc | «Notte.», tram sotto la finestra |
| 59 | Quaranta vasche | notte (t) | sereno | falene | palla | «Piscina, di notte» |
| 60 | La finestra | sera | sereno | — | — | la finestra è «accesa»: fuori è già buio |
| 61 | Venti minuti | notte | sereno | tram | pc | «Dopo la finestra»: la sera è andata avanti |
| 62 | La piazza di Grillo | mattina (t) | nebbia | — | custodia, plettro | «Mattina presto»; la custodia sparisce nella foschia |
| 63 | Fuori tempo | giorno | sereno | — | — | Fischio passa con la posta: giorno, nebbia alzata |
| 64 | Il piccione | giorno | sereno | piccione | pc | il piccione è sveglio: giorno |
| 65 | La locandina | sera | sereno | tram | locandina, zaino | atto della città di notte; il 66 è la stessa sera |
| 66 | Quanto lontana | sera | sereno | falene | — | stessa sera del 65, ultimo lampione acceso |

### Atto 6 · cucina (67-78)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 67 | La cucina | mattina | sereno | — | — | arrivo in cucina, capitolo di viaggio leggero |
| 68 | Briciola | giorno | sereno | — | — | il gatto entra da una finestra aperta |
| 69 | Il cuscino | sera | vento | — | tazze, pianta | «se ti viene freddo»; il 70 è «Mattina» |
| 70 | Due tazze | mattina (t) | sereno | — | tazze, pianta | «Mattina.»; la pianta del 69 sul tavolo |
| 71 | Il sasso capovolto | giorno | nuvole | — | sasso-quota, tazze, pianta | il tè si fredda; nuvole, senza dirlo |
| 72 | Mezzogiorno | giorno (t) | sereno | — | pianta | «Mezzogiorno.» |
| 73 | Pasta fredda | alba (t) | sereno | — | piatto, foglio, pianta | «Le sei», «Buona alba» |
| 74 | Sabato | giorno | sereno | — | pianta | eco: «sono le undici» |
| 75 | Il cassetto | mattina | sereno | — | fiore-cima, palla, pianta | domenica: lei parte a cavallo di mattina |
| 76 | La porta | sera (t) | sereno | — | pianta | «Sera.» |
| 77 | La lettera | mattina | nuvole | — | lettera, piatto, pianta | il latte finito: colazione; la lettera pesa |
| 78 | Due biglietti | giorno | nuvole | — | lettera, piatto, pianta | la lettera resta sotto il piatto |

### Atto 7 · lontano, con cucina e montagna (79-90)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 79 | Il finestrino | mattina | sereno | — | — | si parte presto; il vetro si asciuga al sole |
| 80 | La piazza | giorno | sereno | piccione | — | piazza di giorno; domani c'è il mercato |
| 81 | Il vetrino | giorno | sereno | — | plettro, mela | stesso giorno della piazza; il plettro sotto il vetrino |
| 82 | La sera storta | tramonto (t) | nuvole | — | vetrino, foglio, pianta | «Crepuscolo.»; nuvole per la sera storta |
| 83 | Il fuoco acceso | sera | nuvole | — | carrucola, secchio | fumo dal camino; cielo coperto come all'82 e all'84; non neve: «D'inverno scendo io» dice che l'inverno non c'è ancora, arriva al 94 «È inverno» (C3) |
| 84 | La lettera del Mulo | mattina | nuvole | — | lettera, nodo, zaino | il giorno dopo la baita, in treno; grigio |
| 85 | Una riga a metà (di nuovo) | notte | sereno | — | pianta, piatto, lettera | Semino da solo all'ora sua; la lettera del 77 |
| 86 | Torna (per un po') | tramonto | sereno | — | mela, pianta | lei arriva stanca dal treno; la sera segue |
| 87 | Una brutta e una bella | sera | sereno | — | lettera, piatto, pianta | stessa sera del 86: si racconta la giornata |
| 88 | La cartina | giorno | sereno | — | cartina, matita, pianta | il giorno dopo, la cartina al tavolo |
| 89 | Quello che non lascio | sera | sereno | — | cartina, matita, pianta | eco: «stamattina dalla finestra», quindi più tardi |
| 90 | Il nodo | mattina | nebbia | piccione | — | partenza in stazione d'inverno |

### Atto 8 · ritorno al giardino (91-100)

| n | titolo | momento | meteo | comparse | oggetti | perché |
|---|---|---|---|---|---|---|
| 91 | Il giardino cresciuto | giorno | sereno | rane | bastoncino, sasso-misura | arrivo dopo il treno del mattino; Gianfranca |
| 92 | Pinza arriva | giorno | sereno | — | secchio, tavola | Fischio vola di giorno; Pinza sale «accanto alla tavola» (C3) |
| 93 | La posta | mattina | sereno | — | lettera, foglio | si apre la posta di mattina |
| 94 | Nuvola a valle | giorno | sereno (t) | — | tazze, zaino | «poco vento»: niente vento; inverno senza neve |
| 95 | Torna | giorno | sereno | — | bastoncino, sasso-misura | lei arriva; il bastoncino del 91 al sasso |
| 96 | Stesso ramo, stessa ora | tramonto (t) | sereno | — | piuma, bacca | «Crepuscolo.» = tramonto |
| 97 | Grillo passa | giorno | sereno | — | custodia | Grillo suona di giorno al cancello |
| 98 | La terza strada | giorno | nuvole | — | cartina, matita | sole tra le nuvole per l'arcobaleno della Scena; la cartina con la terza strada e la matita rossa (C3) |
| 99 | L'ora | tramonto (t) | nuvole | — | palla, piatto | «Crepuscolo.»; nuvole: «Domani piove. O no.» |
| 100 | Cento | tramonto (t) | sereno | — | bastoncino, biscotti, sasso-misura | «Crepuscolo nel giardino»; cielo aperto |

Conta: momento detto dal testo in 33 capitoli su 92, scelto in 59; meteo detto dal testo in 6, scelto in 86.

## Punti dubbi

1. **Il temporale di 32-33 non è nel cielo.** Il testo lo mette solo sopra Semina: eco del 32 "sereno dappertutto, tranne in un punto", al 33 "Piove?" "Sopra di lei". Quindi 32 `sereno` (la nuvoletta è quella che la mascotte arrabbiata disegna già), 33 `nuvole` (la nuvola "grande il doppio" è salita in cima), 34 `sereno` ("passa"). Così nessun capitolo ha `temporale`. Se lo screenshot del temporale chiesto dalla spec serve comunque, le strade sono due: 33 `temporale`, che però rovina la battuta "Sopra di lei", oppure 46 `temporale` al posto di `pioggia`, che il testo regge.
   - *Deciso in C3 (lead, 11/11):* non si forza, i dati restano come sono (nessun temporale).
2. **Le lucciole dei fondali sono sempre accese.** Il Fondale del bosco le disegna sempre, quello del giardino di notte. Al 46 ("Le lucciole non vengono"), alla fine del 47 ("Sono andate a dormire") e al 52 ("Non vedo") contraddicono il testo. Proposta per C3: nel bosco il Fondale mostra le sue lucciole solo se `@comparse` ha `lucciole` (43, 44, 48, 53).
   - *Deciso in C3 (lead, 11/11):* fatto così. Nei capitoli con `@ambiente` (dal 9) il Fondale mostra le sue lucciole (bosco, e giardino di notte) solo se `@comparse` ha `lucciole`; senza ambiente (0-8) resta com'era.
3. **Alcuni vestiti disegnano già l'oggetto e in certi capitoli lo contraddicono.** `surf`: Semino ha la tavola in mano anche al 26-27, quando è appoggiata al muretto. `lanterna`: accesa anche al 43 ("spenta sulle ginocchia"), al 52 ("si spegne") e al 54, dove resta sul ramo. `montagna` di Semina: lo zaino è addosso anche al 32-33, quando è per terra. Per non avere due lanterne al 54 non ho messo un oggetto `lanterna`. Si decide in C3 (o con i vestiti), fuori da questo lavoro.
   - *Deciso in C3 (lead, 11/11):* il vestito `surf` è solo la tavola in mano (non separabile), quindi dove `@oggetti` ha `tavola` è cambiato il vestito di Semino in `capitoli.md`: 26 e 27 `surf` → `palla`, l'altro vestito di Semino dell'atto del mare (la tavola resta sul muretto; al 27 lo zaino di "Pinza si aggrappa alla cinghia dello zaino" non è un vestito, perché `zaino-storto` è della montagna e i vestiti seguono l'atto, `luoghi.ts`: in C3 è l'oggetto `zaino` a terra). La lanterna del vestito si disegna spenta quando il momento è alba, mattina o giorno (45, 51). Le altre contraddizioni (lanterna accesa al 43, 52 e 54, zaino di `montagna` al 32-33) restano.
   - *Corretto in C3 (validazione):* al 43 e al 52 `@ambiente` ha `luce=spenta` e la lanterna si disegna spenta anche di sera e di notte; restano il 54 e lo zaino di `montagna` al 32-33.
4. **Due ore nello stesso capitolo.** Ho preso l'ora della scena in cui si parla: 9 `sera` (salto alle 4:10), 14 `alba` (poi "Pomeriggio" per due battute), 36 `alba` (poi "Mezzogiorno"), 53 `notte` (fino alle sei). Il dubbio più grosso è il 10: ho scelto `alba` (Fischio "fischia dalle sei", Semino ha l'umore `dorme`), ma la nota finale e l'eco dicono "alle quattro", cioè notte.
5. **"Crepuscolo" l'ho reso `tramonto`** (49, 82, 96, 99, 100) perché è caldo e chiude bene la giornata. La bibbia chiama "crepuscolo" anche il 43, ma lì servono buio e lucciole, quindi ho messo `sera`. Se si preferisce il crepuscolo blu, quei cinque capitoli diventano `sera`.
6. **Meteo scelti per l'umore e non detti dal testo:** 25 e 69 `vento` (la sabbia nelle orecchie; "se ti viene freddo"), 46 `pioggia` (il fango, le lucciole che non vengono), 62 e 90 `nebbia` (le due partenze del mattino), 83 `nuvole` (era `neve`; corretto in C3: al 83 Nonna Capra dice «D'inverno scendo io», quindi l'inverno non è ancora arrivato, e il 94 «È inverno» viene dopo; coperto come i vicini 82 e 84), qualche `nuvole` nei capitoli in ombra (13, 18, 38, 71, 77-78, 82). Se sembrano troppo "detti", tornano tutti a `sereno` senza toccare nient'altro.
7. **Oggetti che non si vedono perché sono addosso a qualcuno:** il nodo sulla cinghia al 90, lo zaino in spalla al 52, 66 e 95, il secchio al collo di Nuvola al 94, il foglio in mano al 86, la conchiglia al 28. Per mostrarli servirebbe agganciare gli oggetti alle mascotte e ai secondari, cosa che la spec esclude.
8. **Giardino del ritorno (91-100) quasi senza aggiunte.** La Scena della Home disegna già cassetta, tavola sul muretto, locandina, cartina e arcobaleno, quindi il 98 restava senza oggetti. *Corretto in C3:* al 98 ci sono `cartina` e `matita` (il testo le nomina tutte e due), al 92 la `tavola` ("accanto alla tavola"). In giardino tavola e cartina le disegna già la Scena (sbloccate al 26 e al 88): `Ambiente` non le ripete, la riga serve a dire che sono in scena; la matita rossa del 98 si vede a terra. L'inverno del 94 è senza neve ("poco vento, e l'erba è bassa") e le rane ci sono solo al 91 (Gianfranca).
