# Architektur und Wartung

Das Spiel wird als `index.html` ausgeliefert. Formatierung, benannte Konfiguration und kleine Funktionen sind direkt in dieser Datei gepflegt; ein Build oder Bundler ist nicht erforderlich.

## Verantwortlichkeiten

| Bereich                                            | Zuständigkeit                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `TABLE`, `PHYSICS`, `RULES`, `LAUNCHER`, `SCORING` | Tischmaße, physikalische Parameter und Spielregeln                                |
| `rail()`, `MATERIALS`, `rails`                     | Benannte Kollisionssegmente mit separaten Material-, Farb- und Gate-Eigenschaften |
| `update()` und seine Hilfsfunktionen               | Feste Simulationsschritte und ihre Reihenfolge                                    |
| `render()` und `draw…()`                           | Canvas-Ebenen; Ballspuren und Partikel sind visuelle Effekte                      |
| `fitViewport()`, `fitOverlay()`                    | Fensterhöhe, Safe Areas, Tischproportionen und Menügröße                          |
| `handleKeyDown()`, `handleKeyUp()`, `bindTouch()`  | Tastatur und Pointer-Eingaben                                                     |
| `audio`                                            | Synthetische Spieleffekte                                                         |
| `media()`, `playTheme()`, `musicTick()`            | MP3-Wiedergabe und Lautsprecheranimation                                          |
| `pwa.js`                                           | Installation, Hinweise und bestätigte Updates                                     |
| `sw.js`                                            | Versionierter Offline-Snapshot und MP3-Bytebereiche                               |
| `scripts/serve.cjs`                                | Optionaler lokaler HTTP-Server; für die ausgelieferte Website nicht nötig         |

## Physik und Einheiten

Der Tisch verwendet immer **520 × 820 logische Pixel**. Positive x-Werte zeigen nach rechts, positive y-Werte nach unten. Geschwindigkeiten sind Pixel pro Sekunde, Beschleunigungen Pixel pro Quadratsekunde, Winkel Radiant und Zeitwerte Sekunden.

Ein Schritt dauert `PHYSICS.step` (1/240 Sekunde). Die Reihenfolge bleibt bewusst stabil:

1. Timer und Flipperwinkel aktualisieren.
2. Pro Kugel Bewegung integrieren und Kontakte mit Tisch, Flippern, Bumpern und Zielen lösen.
3. Rampen, Kicker und äußere Grenzen prüfen.
4. Kugelpaare auflösen und verlorene Kugeln verarbeiten.
5. Visuelle Effekte und den synthetischen Beat aktualisieren.

Kugelbewegung und Rendering besitzen getrennte Aufgaben. Zufall für Nudges ist von den Zufallswerten für Funken und Bildschirmwackeln getrennt. Zusätzliche Renderframes beeinflussen dadurch keine Nudge-Richtung.

Bei Flipperkontakten wird die Geschwindigkeit der bewegten Oberfläche (`ω × Radius`) berücksichtigt. Slingshots aktivieren ausschließlich ihre nach innen gerichtete lange Fläche. Rückseiten und abgerundete Enden bleiben passiv. Diese Bedingung verhindert die frühere endlose Umlaufbahn. Neue Schienen benötigen einen Namen und explizite Material-/Gate-Eigenschaften; ihre Array-Position definiert keine Mechanik.

## Eingebettete Medien

`embeddedAssets` hält das M24-Kopflogo und das vom Benutzer bereitgestellte Gassenmotiv jeweils einmal. Beide Embleme teilen dieselbe Bildquelle. Das Ghettoblaster-SVG liegt einmal im HTML-Template und wird für Menü, Kopfzeile und Radio-Panel instanziiert.

Das Gassenmotiv wird zentriert und proportional auf den Tisch gezeichnet. Ein leichter dunkler Verlauf erhält den Kontrast zu Kugel, Inserts und Beschriftung. Bei einem Bild-Dekodierungsfehler bleibt der prozedurale Hintergrund verfügbar. `window.pinballReady` erlaubt Tests, die Bildinitialisierung abzuwarten.

## Deterministische Tests

Nur `?test=1` aktiviert `window.__pinballTest`. Die normale Website enthält keine freigeschaltete Szenario-Schnittstelle. Tests konfigurieren Kugeln über `configure()`, setzen eine Sitzung über `reset()` zurück und führen mit `stepTicks()` eine exakte Zahl von Simulationsschritten aus. Rückgaben sind Momentaufnahmen, keine veränderlichen Referenzen auf den Spielzustand. Kugel-IDs erlauben das Verfolgen derselben Kugel über Multiball und Drain hinweg.

`window.advanceTime(ms)` bleibt für externe Spiel-Testclients verfügbar. Der erste Aufruf übernimmt die Simulationsuhr; die normale Animationsschleife zeichnet weiter, fügt dann aber keine Physikschritte hinzu. Das verhindert doppelt fortschreitende Zeit.

`tests/helpers.mjs` startet für jede Suite einen eigenen Server mit freiem Port und eigenem Origin/Offline-Cache. Browser und Server werden auch bei fehlgeschlagenen Assertions geschlossen. Die Tests verändern den HTML-Quelltext nicht. Absichtlich fehlerhafte HTTP-Anfragen deklarieren den erwarteten Konsolenfehler ausdrücklich; JavaScript-Fehler werden weiterhin gesammelt.

## Formatierung und Änderungen

`npm run format` formatiert die Quellen; `npm run format:check` prüft sie. Die langen Base64-Zeilen sind unveränderte Bilddaten und sollen nicht manuell bearbeitet werden.

Bei Layoutänderungen `npm run test:responsive` ausführen: Menü, Spiel, Pause und Vollbild werden auf vollständige Sichtbarkeit einschließlich Touch-Tasten geprüft. `npm run test:drain` schützt die korrigierte Physik anhand der aufgezeichneten Umlaufbahn und 21 Abschussstärken.

Die Regeln für Bildskalierung und mobile Höhe stehen in Codekommentaren an den betreffenden Funktionen. Konstanten werden nach ihrer Bedeutung benannt; Kommentare erklären Einheiten, Randbedingungen und Gründe für scheinbar ungewöhnliche Schutzmaßnahmen.

## PWA-Veröffentlichung

Vor jedem Release die Cachekennung in `sw.js` erhöhen. HTML, Icons, PWA-Code und **beide** Musikdateien sind Pflichtbestandteile eines Offline-Snapshots. Ein fehlgeschlagener Download verhindert die neue Installation und erhält die bisherige Offline-Version. Neue Dateien vollständig hochladen, den Worker zuletzt. Das Spielmenü aktiviert Updates nur nach Bestätigung und lädt aktive oder pausierte Partien nicht automatisch neu.
