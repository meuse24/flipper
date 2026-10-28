# Performance-Prüfung: 60 FPS auf dem Handy

## Echte Geräte: SM-A536B und S10e, 28. Oktober 2026

Das minimierte Release v20 wurde lokal über ADB-Reverse auf zwei per USB angeschlossenen Samsung-Geräten in Chrome 156 geprüft. Normale Echtzeit-Physik, Musik und Spieleffekte liefen; keine manuelle Simulationsuhr und kein Testadapter. Jeder Lauf dauerte 20 Sekunden, die ersten 120 RAF-Intervalle wurden für die Zeitstatistik verworfen. Automatische Flipper-/Abschuss-Eingaben hielten das Spiel aktiv; Touch, Zwei-Finger-Flipper und Wischgesten wurden davor mit nativen Touch-Ereignissen auf den Geräten geprüft. Screenshots entstanden nach der Messung.

| Gerät                     | Vollbild-Viewport |   FPS | Frame p95 | Frame p99 | Max. aktive Kugeln |
| ------------------------- | ----------------- | ----: | --------: | --------: | -----------------: |
| SM-A536B, Hochformat      | 320 × 711         | 59,85 |   16,8 ms |   16,8 ms |                  1 |
| SM-A536B, Querformat      | 711 × 320         | 59,80 |   16,8 ms |   16,8 ms |                  1 |
| S10e SM-G970F, Hochformat | 360 × 760         | 59,83 |   16,8 ms |   16,9 ms |                  5 |
| S10e SM-G970F, Querformat | 760 × 360         | 59,83 |   16,8 ms |   16,8 ms |                  8 |

Die maximale Kugelzahl ist eine beobachtete Spitze, keine durchgehend gehaltene Last. Die SM-A536B-Läufe sind deshalb Einzelkugel-Messungen. Die kurzen RAF-Stichproben sind kein Temperatur-/Akku-Dauertest und kein unabhängiger Compositor-Nachweis.

Auf beiden Geräten bestanden echtes Android-Vollbild, vollständige Sichtbarkeit von Tisch/Touch-Tasten, Abschuss durch die Klappe, Musikwechsel, gleichzeitige Flipper, Wisch-Anstoßen samt sichtbarem Ruck, Tilt/Sperre/Erholung, Pause/Fortsetzen, Offline-Neuladen sowie MP3-Bytebereiche. Offline-Gesang und -Instrumental wurden anschließend auf beiden Geräten geprüft. Keine Spiel-JavaScript-Ausnahmen wurden erfasst. Rohdaten und native Screenshots liegen unter `output/a53-*` und `output/s10e-*`.

Ein echter Layoutbefund auf dem SM-A536B war die Überlappung des dekorativen Header-Untertitels mit der Radio-Beschriftung bei 320 CSS-Pixeln Breite. v21 blendet diesen Untertitel in schmalem Hochformat aus. Die korrigierte Ansicht und der aktive v21-Cache wurden auf beiden Geräten bestätigt; Physik und Rendering entsprechen v20. Eine stockende A53-Debug-Verbindung beim abschließenden Neuladen wurde durch einen neuen dedizierten Test-Tab behoben. Die ursprüngliche automatische Bildschirmdrehung und Rotation wurden auf beiden Geräten wiederhergestellt.

## Abschussklappe in v19 — lokaler Vergleich, 28. Oktober 2026

Der gleiche lokale Browseraufbau wie im folgenden v18-Vergleich wurde mit dem Stand unmittelbar vor und nach dem neuen Schienenbogen erneut geprüft. Beide Varianten erreichten im zehnsekündigen Lauf nach vier Sekunden Warmlauf rund 60,00 RAF-FPS. Die mittlere Renderzeit betrug 0,55 ms vorher und 0,48 ms nachher; Render-p99 lag bei 2,50 beziehungsweise 2,70 ms. Diese Werte gehören zu diesem Vergleich und sind wegen der veränderten Rechnerauslastung nicht als Verbesserung gegenüber den absoluten v18-Zeiten zu lesen. Rohdaten: `output/shooter-benchmark.json`.

Die Bogenschienen sind im bestehenden Hintergrund-Cache enthalten. Ein kleiner zusätzlich gecachter Metall-Sprite wird für die Klappe rotiert; der Lichtimpuls benötigt eine einfache Linie. Auch dieser Vergleich ist eine Desktop-Browsermessung mit mobilem Viewport, kein neuer Test auf dem S10e. Start/Pause nutzen gleichzeitig weniger Abdunklung und schwächere Unschärfe; im Spiel ist das Menü verborgen.

## Tischanzeigen in v18 — lokaler Browservergleich, 28. Oktober 2026

Die neuen Callouts und Punktzahlen wurden gegen die unmittelbar vorherige Darstellung verglichen: Headless Chromium über Playwright auf diesem Windows-Rechner, mobiles Viewport 390 × 844, DPR 3, gleicher begrenzter Canvas. Drei kontrolliert im Spiel gehaltene Kugeln, drei Wertungen alle sechs Frames und wechselnde Ereignismeldungen alle 90 Frames. Je zehn Sekunden, davon vier Sekunden Warmlauf; beide Varianten im selben Browseraufbau, keine parallelen Prüfläufe. Die Grafikmessung umfasst auch Neuaufbauten beim Wechsel einer Meldung.

| Darstellung                   | RAF-FPS | Renderzeit Mittel | Renderzeit p95 | Renderzeit p99 |
| ----------------------------- | ------: | ----------------: | -------------: | -------------: |
| Vorherige Textmeldungen       |   59,84 |           1,32 ms |        1,90 ms |        2,30 ms |
| Neue Callouts und Punktzahlen |   59,34 |           1,04 ms |        1,40 ms |        5,80 ms |

Die Mittelwerte zeigen hier keinen erhöhten dauerhaften Zeichenaufwand; einzelne neue Banner erzeugen höhere Spitzen. Der zusätzliche Effektspeicher lag in diesem Lauf bei 681.600 Bytes. Rohdaten: `output/callout-benchmark-warm.json`. Das ist ein kurzer lokaler Vergleich, keine neue S10e-Messung oder Zusicherung für andere Geräte; beim Test war kein Android-Gerät angeschlossen. Ein zusätzlicher explorativer Lauf mit vierfacher CPU-Drosselung erreichte bereits mit der alten Darstellung nur rund 10 FPS und eignet sich nicht als Nachweis für die frühere Geräte-Messung.

Schrift, Konturen und Schatten werden pro Inhalt vorgezeichnet. Während der Anzeige bleiben eine Banner-Grafik und ein kleiner Lichtzug; Punktzahl-Grafiken und aktive Floater sind jeweils auf zwölf begrenzt. Cache-Wiederverwendung, Speichergrenzen, Ablaufzeiten, Prioritäten und reduzierte Bewegung werden durch `tests/callouts.mjs` geprüft. Die historischen Messungen darunter bleiben zur Einordnung erhalten.

Stand: 27. Oktober 2026. Historischer Audit: Quellstand `a568f66`, PWA-Cache v11. Integration: Release v12.

Auslieferung v13 ergänzt die Fokusübergabe an den Tisch nach Start/Fortsetzen, damit die Leertaste unmittelbar nach einem Menü-Klick funktioniert. Das Rendering entspricht dem unten gemessenen integrierten Stand.

Die größte gemessene Verbesserung kommt vom Vorzeichnen wiederverwendbarer Grafiken und einer begrenzten Canvas-Auflösung. Die geprüften Maßnahmen sind inzwischen in den Produktionscode integriert.

## Integration in v12

- Maximal drei Tisch-Layer und 26 vorgewärmte Bumper-Sprites für die beiden vorhandenen Radien; kein Anwachsen mit Treffern, Partien oder Drehungen. Painter bekommen einen eigenen Kontext.
- Auflösung nach sichtbarer Tischbreite und Geräte-DPR, maximal Renderfaktor 1,25 auf Touch-Geräten und 2 am Desktop. Resize ohne Größenänderung behält die Caches; eine neue Auflösung ersetzt sie vollständig.
- Startmenü und Pause zeichnen nur bei Änderungen, verborgene Seiten gar nicht. Unveränderte Ladestand-/Lautsprecherwerte werden nicht neu geschrieben; verborgene Menü-Lautsprecher werden übersprungen.
- Die 240-Hz-Physik bleibt unverändert. Weiter unten beschriebene Folgeideen zu Speicherallokationen, Audio-Puffern, Highscore-Bündelung und Medienkompression sind nicht Teil dieser Integration.
- Linke/rechte Shift-Taste zusätzlich zu Pfeilen und A/D; gleichzeitig gehaltene Tastencodes werden pro Seite zusammengefasst.
- Größeres Spielfeld ohne obere/untere Zierbänder und ohne separate Titel-/Fußzeilen; Bild bis an beide Tischkanten. Die FPS-Anzeige liegt über dem Bild. Das Seitenverhältnis bleibt erhalten.
- Übersetzungshinweise an der HTML-Wurzel und im Google-Meta-Tag. Der erste echte Klick versucht Vollbild und startet Gesang; weitere Musikentscheidungen bleiben erhalten.

Der integrierte Stand erreichte auf dem S10e in **90 Sekunden Multiball mit Musik im echten Hochformat-Vollbild 59,85 FPS**, p95/p99 **16,8 ms**, maximal **33,4 ms** und **ein** verpasstes Intervall. Der Canvas blieb bei 650 × 1025 Pixeln; die sichtbare Tischbreite wuchs von 320 auf **360 CSS-Pixel**. Es gab keine JavaScript-Ausnahmen. Die Akkutemperatur lag bei 33,6 °C vor und 33,4 °C nach dem Lauf. Nachweis: `output/perf-integrated-multiball-portrait-native-full-90s.json` und gleichnamiger Android-Screenshot.

Im integrierten **Querformat-Vollbild** erreichte ein 30-Sekunden-Multiball-Lauf **59,78 FPS**, p95/p99 **16,8 ms** und zwei verpasste Intervalle, ohne JavaScript-Ausnahmen. Die sichtbare Tischbreite wuchs von 162 auf **201 CSS-Pixel**, der Canvas maß 603 × 951 Pixel. Nachweis: `output/perf-integrated-multiball-landscape-native-full-30s.json` und zugehöriger Android-Screenshot.

Neue Tests für Rendering und erste Aktivierung laufen auch gegen das minimierte Release. Die ursprünglichen Auditmessungen und Empfehlungen folgen als historisches Protokoll; ihre Zeilenangaben beziehen sich auf v11.

## Messaufbau

- Samsung Galaxy S10e, SM-G970F, Android 12, reales 60-Hz-Display, USB angeschlossen.
- Normale Echtzeit-Physik mit 240 Schritten/s; kein `advanceTime`, kein Zeitraffer und kein `?test=1`.
- Musik und synthetische Spieleffekte eingeschaltet, FPS-Anzeige eingeschaltet.
- Automatische Flipper-Eingaben und erneuter Abschuss. Der Multiball-Test hält ungefähr drei Kugeln im Spiel; natürliche zusätzliche Kugeln dürfen bis zur nächsten Kontrolle nach 100 ms kurzzeitig hinzukommen.
- Drei Sekunden Warmlauf, danach Messung der echten `requestAnimationFrame`-Abstände und der JavaScript-Zeit einzelner Funktionen. Screenshots entstehen erst nach der Messung.
- Lokaler Server über ADB-Reverse; Service Worker im Labor ausgeschaltet, damit Varianten nicht versehentlich dieselbe gecachte HTML-Datei laden.
- Unbenutzte Browser-Tabs während der abschließenden Vergleichsläufe eingefroren und anschließend wieder aktiviert.
- Echtes Android-Vollbild per physischem ADB-Tap und Android-Screenshot geprüft. Playwright/CDP meldete zeitweise Vollbild bei unverändertem Browserfenster; die Vollbildmessungen verwenden deshalb direktes CDP ohne Viewport-Emulation.

Die Zahlen messen RAF-Takt und JavaScript-Aufwand. Sie sind kein unabhängiger Nachweis, dass jedes Bild vom Android-Compositor angezeigt wurde. Eine Geräteflotte, ein Akku-Langzeittest und eine Messung ohne angeschlossenes Debugging sind damit ebenfalls nicht abgedeckt.

## Vergleich im echten Hochformat-Vollbild

Sichtbarer Viewport: 360 × 760 CSS-Pixel, Tischbreite 320 CSS-Pixel, Geräte-DPR 3. Jeweils 20 Sekunden mit Multiball und Musik.

| Variante                                       | Canvas-Pixel | Mittlere FPS | Frame-Abstand p95 |     p99 | Größter Abstand | Verpasste 60-Hz-Intervalle |
| ---------------------------------------------- | ------------ | -----------: | ----------------: | ------: | --------------: | -------------------------: |
| Aktueller Code                                 | 1040 × 1640  |        26,20 |           50,3 ms | 66,9 ms |        100,5 ms |                        670 |
| Grafik-Caches, Auflösung nach sichtbarer Größe | 960 × 1514   |        58,71 |           16,8 ms | 33,5 ms |         50,2 ms |                         21 |
| Grafik-Caches, Renderfaktor auf 1,25 begrenzt  | 650 × 1025   |        59,76 |           16,8 ms | 16,9 ms |         17,1 ms |                          0 |

Beim letzten Kandidaten beträgt die Pixelzahl nur 39,1 % des aktuellen Canvas. Die sichtbare Tischgröße bleibt gleich. Das ist eine bewusste Abwägung zwischen feinen Details und Leistungsreserve, keine Änderung der Physik oder der Touch-Koordinaten.

Die Grafik-Caches im Prototyp speichern Schienen, Inserts und Zielzustände sowie Bumper-Sprites einschließlich ihrer Schatten. Trefferblitze verwenden 13 vorbereitete Zustände. Das ist ein Nachweis des Potenzials, noch keine fertig integrierte Qualitätsoption. Für die Produktion müssen Cache-Grenzen, Invalidierung bei Größenänderungen und die Bildqualität geprüft werden.

Der anschließende **90-Sekunden-Lauf** des begrenzten Grafik-Cache-Prototyps im Hochformat-Vollbild mit Multiball bestätigte **59,75 FPS**, p95 **16,8 ms**, p99 **16,9 ms** und ein maximales Intervall von **33,5 ms**. Von 5.376 gemessenen Intervallen lag genau eines über 25 ms. Die mittlere Kugelzahl betrug 2,99; kurzzeitige natürliche Multiball-Ereignisse erreichten fünf Kugeln. Musik und Effekte liefen weiter, und es wurden keine JavaScript-Ausnahmen erfasst. Die vom Gerät gemeldete Akkutemperatur betrug vorher 33,8 °C und danach 33,6 °C; das ist keine Messung der CPU-/GPU-Temperatur und kein thermischer Dauertest.

Im **Querformat-Vollbild** (760 × 360 CSS-Pixel) erreichte die aktuelle Version in 30 Sekunden Multiball **26,34 FPS** bei p95 **50,3 ms**. Der Prototyp erreichte anschließend **59,76 FPS**, p95 **16,8 ms**, p99 **16,9 ms**, maximal **17,1 ms** und keine verpassten Intervalle. Sein Canvas hatte 486 × 766 Pixel bei 162 CSS-Pixeln Tischbreite; hier reicht bereits die Berechnung nach sichtbarer Größe, ohne das Qualitätslimit auszureizen. Auch dieser Lauf erfasste keine JavaScript-Ausnahmen.

Die nativen Hoch-/Querformat-Screenshots sowie ein zusätzlicher Durchlauf mit dem unveränderten Playwright-Client des Web-Game-Skills wurden visuell geprüft. Die verkleinerte Auflösung macht Details im großen Hochformat weicher; die Grafik-Caches erhalten Schienen, Neonfarben und Leuchteffekte. Der Skill-Client bestätigte Spielstart und Kugelabschuss, ersetzt aber keine vollständige Regression einer späteren Produktionsintegration.

## Befunde und Reihenfolge der Optimierung

### 1. Wiederverwendbare Zeichnungen vorzeichnen

`render()` zeichnet derzeit bei jedem Frame alle Schienen, Bumper-Ringe, Schatten, Beschriftungen und Ziele erneut. Nur das Hintergrundmotiv ist bereits gecacht.

Betroffene Stellen in `index.html`: `render()` ab Zeile 2991, `speaker()` ab 2947, `drawRails()` ab 3013, `drawInserts()` ab 3020 und `drawTargets()` ab 3048.

Empfehlung: Schienen mit dem statischen Tischhintergrund zusammenfassen; Ziel- und Insert-Layer nur bei Zustandsänderungen aktualisieren; Bumper-Körper und Leuchteffekte als kleine wiederverwendbare Sprites zeichnen. Caches müssen begrenzt bleiben und bei einer Änderung der Renderauflösung neu aufgebaut werden. Kurze Trefferanimationen lassen sich ohne permanente Blur-Berechnung abspielen.

Im Browserfenster stieg ein kontrollierter Ein-Kugel-Lauf allein durch diese Caches von 21,71 auf 45,94 FPS bei unveränderter Canvas-Auflösung. Zusammen mit einer an die sichtbare Größe angepassten Auflösung waren es 57,19 FPS. Auch der Drei-Kugel-Lauf erreichte damit 57,38 FPS.

### 2. Auflösung vom sichtbaren Tisch und einem Renderbudget ableiten

`fitViewport()` ab Zeile 3182 verwendet `Math.min(2, devicePixelRatio || 1)` bezogen auf die festen logischen Maße 520 × 820. Dadurch entsteht auf dem S10e auch bei einem deutlich kleineren Tisch stets ein Canvas mit 1040 × 1640 Pixeln.

Empfehlung: Die interne Auflösung aus sichtbarer Tischbreite × Geräte-DPR ableiten und zusätzlich durch ein Qualitätsbudget begrenzen. Der Versuch mit Faktor 1,25 entspricht 650 × 1025 Pixeln. Ein automatischer Qualitätsmodus sollte die Auflösung nur nach längeren Messfenstern und mit Hysterese ändern; häufiger Neuaufbau würde selbst Ruckler verursachen. Manuelle Auswahl und ein höheres Qualitätsprofil sind sinnvoll.

Ein sehr niedriger fester Faktor von 1 war in den Versuchen nicht zuverlässig schneller. Einmalige FPS-Werte oder die reine Pixelzahl reichen deshalb nicht für die Auswahl eines Qualitätsprofils. Maßgeblich sind längere Messungen einschließlich p95/p99 und Bildqualität.

### 3. Arbeit ohne sichtbare Änderungen vermeiden

`frame()` ab Zeile 3255 ruft `render()` auch im Startmenü und während einer Pause fortlaufend auf. `update()` stoppt dann zwar die Physik, aber nicht das Zeichnen. `musicTick()` ab Zeile 3540 schreibt zudem in jedem Frame Transform-Werte auf alle Lautsprechermembranen, auch bei unverändertem Wert oder verborgenen Elementen. Die Musikdaten sind nur mit 30 Hz abgetastet.

Empfehlung: Statische Ansichten nur bei Änderungen neu zeichnen; im Hintergrund explizit pausieren. Lautsprecheranimation höchstens bei einem neuen Sample beziehungsweise einem geänderten Transform aktualisieren und auf sichtbare Ghettoblaster begrenzen. Den Ladebalken in `render()` ebenfalls nur bei geänderter Ladung aktualisieren. Das hilft besonders bei Energieverbrauch und Wärme.

Das Abschalten der Lautsprecheranimation oder des CSS-Backdrop-Blurs allein brachte in den ersten Versuchen keinen entscheidenden FPS-Gewinn. Diese Maßnahmen ersetzen die Canvas-Optimierungen nicht.

### 4. Seltene Spitzen und unnötige Allokationen reduzieren

- `sync()` ab Zeile 2283 aktualisiert bei jedem Treffer mehrere DOM-Werte und schreibt bei jedem neuen Bestwert synchron in `localStorage`. Änderungen sammeln, höchstens einmal pro Frame im HUD übernehmen und Bestwerte zeitlich bündeln; beim Rundenende beziehungsweise Verlassen der Seite speichern.
- `handleDrains()` ab Zeile 2707 erzeugt pro Physikschritt zwei neue Arrays. `updateEffects()` ab 2726 erzeugt zusätzlich neue Partikel- und Text-Arrays, auch wenn sie leer sind. Überlebende Einträge lassen sich ohne neue Arrays kompaktieren.
- `resolveTableContacts()` erzeugt temporäre Flippersegmente und Kollisionsoptionen pro Kugel und Schritt. Diese Daten lassen sich pro Flipper aktualisieren und wiederverwenden.
- `audio.noise()` ab Zeile 2098 erstellt und befüllt für jeden Scratch/Nudge einen neuen Audiopuffer. Ein kleiner Vorrat wiederverwendbarer Noise-Puffer kann seltene Spitzen reduzieren.
- `drawBalls()` ab Zeile 3118 erstellt Kugelverlauf, Schatten und Gradient wiederholt. Kugelkörper mit Schatten als Sprite cachen; für Trails einen kleinen festen Ringpuffer verwenden.

Diese Punkte sind Folgeoptimierungen. Im Vollbild-Multiball verbrauchte die aktuelle Physik im Mittel etwa 0,09 ms pro 240-Hz-Schritt, also ungefähr 0,36 ms pro regulärem 60-Hz-Frame. Die durchschnittliche JavaScript-Zeichenzeit lag bei 2,76 ms. Diese Zeiten erfassen nicht die nachgelagerte Rasterisierung und Komposition. Das deutliche Verhalten der Grafikvarianten spricht für die Zeichenpipeline als Haupthebel. Eine Reduktion der Physikrate wäre als erster Schritt nicht begründet und würde das Kollisionsverhalten riskieren.

### 5. Ladezeit und Speicher separat verbessern

Das eingebettete Tisch-JPEG hat 1536 × 2752 Pixel und 3.346.489 komprimierte Bytes. Dazu kommen ein Logo mit 1530 × 1530 Pixeln und ein Seitenhintergrund mit 1672 × 941 Pixeln. Zusammen entsprechen die unkomprimierten Bildflächen rechnerisch etwa 31 MiB bei vier Bytes pro Pixel, ohne Browserkopien oder Canvas-Texturen.

Eine passende Auslieferungsauflösung und Bildkompression können Startzeit und Speicherbedarf reduzieren. Die Originale sollten als Master erhalten bleiben. Das große HTML und Base64 sind vor allem ein Lade-/Speicherthema; Minifizierung allein behebt die niedrige Bildrate im laufenden Spiel nicht.

## Abnahme einer späteren Umsetzung

1. Caches und Qualitätsbudget sauber in den Produktionscode integrieren, ohne Physik oder Eingabekoordinaten zu ändern.
2. Spielfeldgrafik bei unterschiedlichen Auflösungen und bei Drehung visuell vergleichen, Cache-Speicher begrenzen und stabile Invalidierung prüfen.
3. Bestehende Spiel-, Drain-, Responsive-, Offline-, PWA- und Release-Tests ausführen.
4. Auf dem echten Handy Ein-Kugel- und Multiball-Läufe in Fenster/Vollbild sowie Hoch-/Querformat messen, jeweils mit Audio und FPS-Anzeige.
5. Über mehrere Minuten auf einem erwärmten Gerät messen. Ein sinnvolles Ziel ist die native 60-Hz-Kadenz mit p95 nahe 16,7 ms, möglichst wenigen Intervallen über 25 ms und ohne ansteigenden Speicherverbrauch. Eine einzelne Anzeige „60“ ist kein ausreichender Nachweis.

## Lokale Nachweise

Die isolierten Versuche und Rohdaten liegen im von Git ausgeschlossenen Verzeichnis `output/`:

- `perf-baseline-source.html`: unveränderter Quellstand für alle Varianten.
- `perf-server.cjs`: lokaler Variantenserver, Port 8098, keine Veröffentlichung.
- `perf-phone.mjs`: Browserfenster-Vergleiche über Playwright.
- `perf-native.mjs`: echte Android-Vollbildmessung über direktes CDP und ADB, stellt die Rotationseinstellungen anschließend wieder her.
- `perf-*-multiball-portrait-native-full.json` und zugehörige PNGs: obige Vergleichsmessungen.
- `perf-cap125-cacheall-multiball-portrait-native-full-90s.json`: längerer Hochformat-Lauf.
- `perf-*-multiball-landscape-native-full-30s.json`: Querformat-Vergleich.
- `perf-exploratory/` und `perf-with-background-tab/`: Vorversuche; nicht mit den abschließenden Vollbildmessungen vermischen.

Beispiel für eine Wiederholung mit angeschlossenem, entsperrtem S10e und aktivem Chrome-Debugging:

```powershell
adb forward tcp:9223 localabstract:chrome_devtools_remote
adb reverse tcp:8098 tcp:8098
node output/perf-server.cjs
# In einer zweiten Konsole, bei bereits geöffnetem Labor-Tab:
node output/perf-native.mjs baseline,fit-cacheall,cap125-cacheall 20 multiball
```

Andere Geräte benötigen gegebenenfalls andere native UI-Automation. Die lokalen Prototypen sind weder Bestandteil des Release-Pakets noch deployt.
