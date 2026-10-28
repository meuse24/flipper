# Architektur und Wartung

Das Spiel wird als `index.html` ausgeliefert. Formatierung, benannte Konfiguration und kleine Funktionen sind direkt in dieser Datei gepflegt; ein Build oder Bundler ist nicht erforderlich.

## Verantwortlichkeiten

| Bereich                                            | Zuständigkeit                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `TABLE`, `PHYSICS`, `RULES`, `LAUNCHER`, `SCORING` | Tischmaße, physikalische Parameter und Spielregeln                                           |
| `rail()`, `arcRails()`, `MATERIALS`, `rails`       | Benannte Kollisionssegmente mit Material, Reibung und Farbe; Bögen aus verbundenen Segmenten |
| `update()` und seine Hilfsfunktionen               | Feste Simulationsschritte und ihre Reihenfolge                                               |
| `render()` und `draw…()`                           | Canvas-Ebenen; Ballspuren und Partikel sind visuelle Effekte                                 |
| `fitViewport()`, `fitOverlay()`                    | Fensterhöhe, Safe Areas, Tischproportionen und Menügröße                                     |
| `handleKeyDown()`, `handleKeyUp()`, `bindTouch()`  | Tastatur und Pointer-Eingaben                                                                |
| `audio`                                            | Synthetische Spieleffekte                                                                    |
| `media()`, `playTheme()`, `musicTick()`            | MP3-Wiedergabe und Lautsprecheranimation                                                     |
| `pwa.js`                                           | Installation, Hinweise und bestätigte Updates                                                |
| `sw.js`                                            | Versionierter Offline-Snapshot und MP3-Bytebereiche                                          |
| `scripts/serve.cjs`                                | Optionaler lokaler HTTP-Server; für die ausgelieferte Website nicht nötig                    |

## Physik und Einheiten

Der Tisch verwendet immer **520 × 820 logische Pixel**. Positive x-Werte zeigen nach rechts, positive y-Werte nach unten. Geschwindigkeiten sind Pixel pro Sekunde, Beschleunigungen Pixel pro Quadratsekunde, Winkel Radiant und Zeitwerte Sekunden.

Ein Schritt dauert `PHYSICS.step` (1/240 Sekunde). Die Reihenfolge bleibt bewusst stabil:

1. Timer und Flipperwinkel aktualisieren.
2. Pro Kugel Bewegung integrieren und Kontakte mit Tisch, Flippern, Bumpern und Zielen lösen.
3. Rampen, Kicker und äußere Grenzen prüfen.
4. Kugelpaare auflösen und verlorene Kugeln verarbeiten.
5. Visuelle Effekte und den synthetischen Beat aktualisieren.

Kugelbewegung und Rendering besitzen getrennte Aufgaben. Zufall für Nudges ist von den Zufallswerten für Funken und Bildschirmwackeln getrennt. Zusätzliche Renderframes beeinflussen dadurch keine Nudge-Richtung.

Ein Touch-/Stift-Wisch nach oben löst denselben Nudge wie `N` aus: mindestens 36 CSS-Pixel in höchstens 450 ms und deutlich vertikaler als horizontaler Weg. Jeder Pointer kann nur einmal pro Kontakt anstoßen; der Aufzugbereich ist ausgenommen. Tastatur und Touch-Pointer halten Flipper über getrennte Mengen, damit das Loslassen eines Fingers keine andere gehaltene Eingabe aufhebt. Abbruch und verlorenes Pointer-Capture räumen Kontakte auf. Der visuelle Ruck verschiebt das gesamte Canvas-Motiv für 220 ms um bis zu zwölf logische Pixel nach oben, unabhängig von der Kugelphysik; reduzierte Bewegung unterdrückt ihn. `tests/touch-nudge.mjs` prüft echte Touch-Ereignisse in Hoch-/Querformat, Mehrfinger-Eingaben, Abbruch, Aufzug, Tilt und die Rückkehr des Bildes in die Ruhelage.

Bei Flipperkontakten wird die Geschwindigkeit der bewegten Oberfläche (`ω × Radius`) berücksichtigt. Slingshots aktivieren ausschließlich ihre nach innen gerichtete lange Fläche. Rückseiten und abgerundete Enden bleiben passiv. Diese Bedingung verhindert die frühere endlose Umlaufbahn. Neue Schienen benötigen einen Namen und explizite Material-/Reibungseigenschaften; ihre Array-Position definiert keine Mechanik.

`SHOOTER`, `arcRails()` und `shooterGate` bilden einen echten Abschusskanal. Sämtliche festen Schienen bleiben immer kollidierbar; die frühere Links-Beschleunigung und die unsichtbare seitliche Korrektur sind entfernt. Der obere Bogen hat geringe tangentiale Reibung; die minimale Federenergie wurde auf den höheren realen Weg abgestimmt. Zusammenhängende Bogensegmente werden als eine glatte Linie in den Hintergrund-Cache gezeichnet.

Die Einwegklappe ist ein schwenkendes Kollisionssegment mit derselben Lage und Dicke wie ihre Metallgrafik. Ein ankommender Abschuss öffnet sie nach innen; aus dem Spielfeld kann sie geschlossen nicht rückwärts geöffnet werden. Sie wartet kurz, bis die Kugel frei ist, und schließt mit einem gedämpften Metallgeräusch. Ein kleiner gecachter Sprite, Rotation und ein kurzer Lichtimpuls reichen für die Darstellung. `tests/shooter-gate.mjs` prüft 21 Abschussstärken, den Abstand zur tatsächlichen Klappe, Schwerkraft ohne seitliche Hilfskraft, Rückprall und erneutes Schließen.

Die unteren Führungsschienen schließen tangential an das dickere Gummi der Flipper-Drehpunkte an. Ihre symmetrische Neigung vermeidet die früheren Mulden und eine kleine aufwärts gerichtete Kante am Übergang. Die Slingshot-Spitzen enden acht Pixel höher, damit eine volle Kugelbreite zur Führung frei bleibt. `tests/natural-drain.mjs` prüft beide eingefangenen Ruhelagen und 22 langsame Anläufe ohne Anstoßen oder Flipper-Eingabe.

## Eingebettete Medien

`embeddedAssets` hält das M24-Kopflogo und das vom Benutzer bereitgestellte Gassenmotiv jeweils einmal. Beide Embleme teilen dieselbe Bildquelle. Das Ghettoblaster-SVG liegt einmal im HTML-Template und wird für Menü, Kopfzeile und Radio-Panel instanziiert.

Das Gassenmotiv wird zentriert und proportional auf den Tisch gezeichnet. Ein leichter dunkler Verlauf erhält den Kontrast zu Kugel, Inserts und Beschriftung. Bei einem Bild-Dekodierungsfehler bleibt der prozedurale Hintergrund verfügbar. `window.pinballReady` erlaubt Tests, die Bildinitialisierung abzuwarten.

## Rendering, Speicher und mobile Bildrate

`RENDERING` begrenzt die Auflösung auf die tatsächliche Tischbreite in Geräte-Pixeln und maximal 1,25 logische Renderpixel auf Geräten mit grobem Zeiger beziehungsweise 2 am Desktop. Die 520 × 820 Physikkoordinaten bleiben davon unabhängig. `fitViewport()` reserviert nur die echte Touch-Zeile; Titel, Fußzeile und obere/untere Zierbänder beanspruchen keine zusätzliche Tischhöhe. Die Hintergrundgrafik reicht bis zu beiden Tischkanten. Breite und Seitenverhältnis begrenzen die Höhe auf schmalen Displays.

`renderCache` hält höchstens drei Tisch-Layer (Hintergrund mit Schienen, Inserts, Zielzustände) und 13 vorgewärmte Bumper-Sprites je unterschiedlichem Radius. Painter erhalten ihren eigenen Canvas-Kontext; der Live-Kontext wird nicht vorübergehend umgebogen. Neue Combo-/Zielzustände ersetzen den bisherigen Layer. Bei geänderter Pixelgröße werden sämtliche alten Einträge freigegeben, identische Resize-Ereignisse behalten sie. Ein nachgeladenes Hintergrundbild invalidiert nur den Hintergrund-Layer. Diese Grenzen verhindern ein Anwachsen über Partien, Treffer oder Drehungen hinweg.

`showCallout()` verwaltet eine einzige ereignisbezogene Anzeige mit Priorität und Ablaufzeit auf der Simulationsuhr. Niedrigere Prioritäten ersetzen eine neue wichtige Anzeige frühestens nach 1,1 Sekunden; Tilt bleibt bis zum Ende geschützt. Es gibt keine Warteschlange alter Meldungen. Combo-Anzeigen erscheinen nur bei 3, 5, 8 und 10 Treffern. Die englischen Meldungen und der zugängliche Status bleiben erhalten.

Eine kleine Canvas-Grafik enthält das aktuelle Poster mit Schriftkontur, Schatten und statischen Scanlines; ein zweiter Sprite liefert den einmaligen Lichtzug. Animationen verwenden nur Transformationen, Deckkraft und sechs kurze Linien. Punktzahlen nutzen höchstens zwölf wiederverwendete Sprites, maximal zwölf aktive Floater. Größenänderungen leeren diese Caches. Die Kugeln werden nach den Effekten gezeichnet. `rendering()` meldet den zusätzlichen Speicher und die Zahl der Banner-Neuaufbauten, damit Tests Cache-Wiederverwendung und Grenzen prüfen können. Die Ereignissteuerung orientiert sich an den priorisierten Displays und Animationen des [Mission Pinball Frameworks](https://missionpinball.org/dev/start/features/).

Die RAF-Schleife zeichnet während des Echtzeitspiels kontinuierlich, bei Startmenü/Pause nur nach Änderungen und im Hintergrund gar nicht. `advanceTime()` zeichnet explizit; die manuelle Uhr erzeugt keine zusätzlichen automatischen Render-Samples. FPS zählen die gerenderten Frames; Menü und Pause bekommen statische Statusangaben. Identische Ladestand- und Lautsprecher-Transform-Werte werden nicht erneut ins DOM geschrieben.

`tests/rendering.mjs` prüft Auflösungs-/Cache-Grenzen, warme Trefferphasen, Ziel-/Combo-Invalidierung, ruhende Menüs, Pause und wiederholte Drehungen. `window.__pinballTest.rendering()` liefert ausschließlich in `?test=1` die dafür nötigen Zähler und eine rechnerische Bitmap-Größe, keine GPU-Speichermessung. Echte Handy-Messungen und ihre Grenzen stehen in [PERFORMANCE.md](PERFORMANCE.md).

## Eingaben und erste Aktivierung

Physische `ShiftLeft`/`ShiftRight` steuern den jeweiligen Flipper zusätzlich zu Pfeilen und A/D. Pro Seite hält eine Menge die gedrückten Tastencodes; das Loslassen einer Taste löst eine andere weiterhin gehaltene Taste derselben Seite nicht. Fokusverlust leert beide Mengen.

Ein Capture-Listener reagiert auf den ersten vertrauenswürdigen Klick und versucht innerhalb derselben Benutzeraktivierung Vollbild, AudioContext und Gesangstrack zu starten. Ein erster Musikknopf-Klick wird dabei nicht doppelt weitergeschaltet. Tastaturstart und bereits getroffene Musikentscheidungen werden respektiert. Abgelehntes oder fehlendes Vollbild bleibt ein nutzbarer Fenstermodus. `tests/startup.mjs` prüft Aktivierung, Musikfolge und Ablehnung; im Szenario-Modus bleibt die automatische Erstklick-Aktivierung aus.

Die Dokumentwurzel ist mit `translate="no"` und `class="notranslate"` gekennzeichnet; das Google-Meta-Tag ergänzt die Browserhinweise gegen automatische Übersetzung. Die englische Sprachangabe bleibt korrekt. Die tatsächliche Anzeige von Browser-UI bleibt unter Kontrolle des jeweiligen Browsers.

## Deterministische Spieltests

Nur `?test=1` aktiviert `window.__pinballTest`. Die normale Website enthält keine freigeschaltete Szenario-Schnittstelle. Tests konfigurieren Kugeln über `configure()`, setzen eine Sitzung über `reset()` zurück und führen mit `stepTicks()` eine exakte Zahl von Simulationsschritten aus. Rückgaben sind Momentaufnahmen, keine veränderlichen Referenzen auf den Spielzustand. Kugel-IDs erlauben das Verfolgen derselben Kugel über Multiball und Drain hinweg.

`window.advanceTime(ms)` bleibt für externe Spiel-Testclients verfügbar. Der erste Aufruf übernimmt die Simulationsuhr; die normale Animationsschleife zeichnet weiter, fügt dann aber keine Physikschritte hinzu. Das verhindert doppelt fortschreitende Zeit.

`tests/helpers.mjs` startet für jede Suite einen eigenen Server mit freiem Port und eigenem Origin/Offline-Cache. Browser und Server werden auch bei fehlgeschlagenen Assertions geschlossen. Die Tests verändern den HTML-Quelltext nicht. Absichtlich fehlerhafte HTTP-Anfragen deklarieren den erwarteten Konsolenfehler ausdrücklich; JavaScript-Fehler werden weiterhin gesammelt.

## Formatierung und Änderungen

`npm run format` formatiert die Quellen; `npm run format:check` prüft sie. Die langen Base64-Zeilen sind unveränderte Bilddaten und sollen nicht manuell bearbeitet werden.

Bei Layoutänderungen `npm run test:responsive` ausführen: Menü, Spiel, Pause und Vollbild werden auf vollständige Sichtbarkeit einschließlich Touch-Tasten geprüft. `npm run test:drain` schützt die korrigierte Physik anhand der aufgezeichneten Umlaufbahn und 21 Abschussstärken.

Die Regeln für Bildskalierung und mobile Höhe stehen in Codekommentaren an den betreffenden Funktionen. Konstanten werden nach ihrer Bedeutung benannt; Kommentare erklären Einheiten, Randbedingungen und Gründe für scheinbar ungewöhnliche Schutzmaßnahmen.

## PWA-Veröffentlichung

Vor jedem Release die Cachekennung in `sw.js` erhöhen. HTML, Icons, PWA-Code und **beide** Musikdateien sind Pflichtbestandteile eines Offline-Snapshots. Ein fehlgeschlagener Download verhindert die neue Installation und erhält die bisherige Offline-Version. Neue Dateien vollständig hochladen, den Worker zuletzt. Das Spielmenü aktiviert Updates nur nach Bestätigung und lädt aktive oder pausierte Partien nicht automatisch neu.
