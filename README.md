# BADBOY — Ghetto Pinball

**M24 GMEU · Bronx Style · No quarters. All respect.**

Ein Pinball-Arcade-Spiel für Desktop, Tablet und Handy: eigene 2D-Physik, Multiball, neonfarbene Bumper und ein animierter M24-Ghettoblaster mit Rap-Soundtrack. Das Spielfeld passt sich dem sichtbaren Browserfenster und dem Vollbild an – im Hochformat und im Querformat.

![BADBOY Ghetto Pinball mit Bronx-Hintergrund und M24 Street Radio](docs/images/gameplay.png)

## Starten

`index.html` direkt im Browser öffnen. Spiel, Bronx-Seitenhintergrund, das bereitgestellte Gassenmotiv für den Flipper-Tisch und M24-Kopflogo sind in der HTML-Datei enthalten. Die beiden Musikdateien unter `assets/` müssen für den Soundtrack danebenliegen. Ein Build ist nicht erforderlich.

Für PWA, Offline-Cache und lokale Entwicklung mit installiertem Node.js:

```sh
git clone https://github.com/meuse24/flipper.git
cd flipper
npm start
```

Anschließend **[http://127.0.0.1:8090](http://127.0.0.1:8090)** öffnen. Für diesen Start sind keine npm-Abhängigkeiten nötig. Ein anderer Port lässt sich über `PINBALL_PORT` einstellen.

## Steuerung

| Aktion                   | Tastatur                                     | Handy / Tablet                                     |
| ------------------------ | -------------------------------------------- | -------------------------------------------------- |
| Linker / rechter Flipper | Linke / rechte Shift-Taste, ← / → oder A / D | Linke / rechte Spielfeldhälfte oder Flipper-Tasten |
| Kugel starten            | Leertaste oder ↓ halten, dann loslassen      | **HOLD TO LAUNCH** halten und loslassen            |
| Tisch anstoßen           | N                                            | Kurz auf dem Spielfeld nach oben wischen           |
| Pause / fortsetzen       | P                                            | Pause-Taste oben                                   |
| Vollbild umschalten      | F                                            | Vollbild-Taste oben                                |
| Start / Neustart         | Enter oder Startknopf                        | Startknopf                                         |
| Musik umschalten         | Ghettoblaster anklicken                      | Ghettoblaster antippen                             |

Der Ghettoblaster schaltet zwischen **Gesang → Instrumental → Aus**. Seine Lautsprecher pulsieren anhand des tatsächlichen Abspielzeitpunkts. **FX ON/OFF** steuert die synthetischen Spieleffekte unabhängig von der Musik. Audio startet nach einer Benutzeraktion. Android kann Vollbild mit der Zurück-Geste bzw. Zurück-Taste beenden; am Desktop funktioniert auch Escape.

Der Soundtrack besteht aus **BADBOY — Rule the Block** (Gesang, 2:25) und **BADBOY — Bronx Bass Pressure** (Instrumental, 1:38). Beide vom Projektinhaber bereitgestellten WAV-Dateien wurden als Mono-MP3 mit 96 kbit/s und 44,1 kHz komprimiert; zusammen benötigen sie etwa 2,9 MB. Die technischen Dateinamen `lucky-seven-song.mp3` und `lucky-seven-theme.mp3` bleiben erhalten. Die Bassanimation ist auf die neuen Tracks abgestimmt; beide werden wiederholt abgespielt.

Beim ersten echten Klick versucht das Spiel, Vollbild zu aktivieren, und startet den Gesangstrack. Browser ohne nutzbares Vollbild bleiben im Fenster. Ein erster Klick auf den Ghettoblaster startet ebenfalls zunächst Gesang; weitere Klicks schalten normal weiter. Die Oberfläche trägt `translate="no"`, `notranslate` und das Google-Meta-Tag, damit unterstützende Browser keine automatische Übersetzung anbieten.

Die **FPS**-Taste oben schaltet die Bildratenanzeige am Spielfeldrand ein oder aus. Sie ist standardmäßig aus; die Auswahl wird lokal gespeichert. Der Wert wird alle 0,5 Sekunden aus den tatsächlich gerenderten Frames berechnet. In der Pause steht dort **FPS PAUSED**, im Menü **FPS —**, weil der Tisch dann nur bei Änderungen neu gezeichnet wird.

## Spielregeln

- Drei Kugeln pro Partie. Die Startphase schützt acht Sekunden lang vor einem verlorenen Ball.
- Die Abschussbahn führt über einen festen Schienenbogen durch eine bewegliche Metallklappe ins Spielfeld. Die Klappe öffnet für den Abschuss, lässt einen kurzen Lichtimpuls aufleuchten und schließt mit einem leisen Klack. Geschlossen blockiert sie Schüsse zurück in die Abschussbahn.
- Die drei 808-Speaker bringen Respect Points. Schnelle Treffer bilden Combos.
- Alle drei goldenen Ziele abräumen: drei Kugeln gleichzeitig und ein höherer Bling-Multiplikator.
- Aufwärts in die violette **Cash Run**-Rampe schießen: 2.500 Punkte mal Multiplikator.
- Slingshots und Kicker bringen zusätzliche Punkte. Zu viele schnelle Nudges sperren die Flipper für vier Sekunden: **TILT**.
- Ein kurzer Wisch nach oben auf dem Spielfeld stößt den Tisch an; derselbe Finger kann pro Wisch nur einen Stoß auslösen. Der Tisch macht dabei einen kurzen Ruck nach oben. Kleine Fingerbewegungen und Wischen im Aufzugbereich zählen nicht. Drei schnelle Stöße lösen Tilt aus. Bei reduzierter Bewegung entfällt der visuelle Ruck.
- Die Gold-Targets sind ab drei Bällen auf dem Tisch gesperrt und abgedunkelt. Bei höchstens zwei Bällen werden sie automatisch wieder aktiv; gesperrte Treffer geben keine Punkte und lösen keinen weiteren Gold Rush aus.
- Gold Rush, Cash Run, Combo-Meilensteine, Ball Save und Tilt bekommen eigene kurze Tischanzeigen mit farbigen Konturen, Lichtzug und einem schnellen Auftritt. Wichtige Ereignisse haben Vorrang; die Kugel bleibt vor den Anzeigen sichtbar. Schrift und Leuchten werden als begrenzte Grafiken vorbereitet und wiederverwendet. Reduzierte Bewegung schaltet die zusätzlichen Bewegungs- und Glanzeffekte aus.
- Der Highscore bleibt im lokalen Browserspeicher erhalten, sofern dieser verfügbar ist.

## Fenster, Vollbild und Ausrichtung

Die Größenberechnung berücksichtigt den sichtbaren Viewport, mobile Browserleisten, Displayausschnitte und Vollbildwechsel. Die Tischproportionen und die Physik bleiben beim Drehen erhalten. Im Hochformat stehen Score und Touch-Tasten oberhalb bzw. unterhalb des Tisches; auf niedrigen Querformat-Displays liegen die Flipper-Tasten seitlich. Start- und Pausenmenüs passen sich ebenfalls an die verfügbare Höhe an.

Das Spielfeld nutzt die verfügbare Höhe ohne obere und untere Zierrahmen oder zusätzliche Titel-/Fußzeilen. Das Hintergrundmotiv reicht bis an beide Tischkanten. Die Seitenproportionen bleiben erhalten; auf sehr schmalen Displays begrenzt die Breite die Tischhöhe.

Für flüssiges Spielen werden Schienen, Ziele, Inserts und alle 13 Bumper-Leuchtphasen in begrenzten Grafik-Caches gehalten. Die Canvas-Auflösung folgt der sichtbaren Tischgröße; auf Touch-Geräten ist der Renderfaktor auf 1,25 begrenzt, am Desktop auf 2. Dadurch bleiben mehr Reserven für 60 FPS, bei etwas weicheren Details auf großen Handy-Displays. Die Physik läuft weiterhin mit 240 Hz. Messaufbau und Ergebnisse: [Performance-Dokumentation](docs/PERFORMANCE.md).

## Als App installieren / offline spielen

Das Spiel einmal online über **HTTPS oder localhost** laden. Im Startmenü **INSTALL APP** wählen. Unterstützte Browser zeigen ihren Installationsdialog; sonst erscheint eine passende Browser-Anleitung. Auf iPhone/iPad wird die Installation über Safari erklärt.

Diese Dateien gemeinsam bereitstellen:

```text
index.html
pwa.js
sw.js
manifest.webmanifest
assets/
  icon-180.png
  icon-192.png
  icon-512.png
  lucky-seven-song.mp3
  lucky-seven-theme.mp3
```

Der versionierte Cache enthält auch beide Musikdateien und unterstützt Audio-Bytebereiche für die Offline-Wiedergabe. Updates werden im Start- oder Game-over-Menü angeboten und erst nach Bestätigung aktiviert. Laufende und pausierte Partien werden nicht automatisch neu geladen. Für eine Veröffentlichung die Cacheversion in `sw.js` erhöhen und die neuen Dateien vollständig hochladen, den Worker zuletzt.

Beim direkten Öffnen über `file://` funktioniert das Spiel einschließlich lokaler Musikdateien; PWA-Installation und Service Worker benötigen einen Webserver. Alle öffentlichen Laufzeitdateien sind statisch und können beispielsweise auf GitHub Pages oder einem eigenen HTTPS-Webspace liegen.

## Minimiertes Release und Webserver-Upload

Wie beim Dino-Spiel bleiben die Quellen lesbar. Der optionale Release-Build minimiert JavaScript mit Terser, CSS mit CSSO und HTML mit HTMLMinifier-Terser:

```sh
npm ci
npm run build
npm run test:release
npm run deploy -- --dry-run --tls12
npm run deploy -- --tls12
```

`release/` enthält das vollständige Upload-Paket: neun Laufzeitdateien (HTML, PWA, Worker, Manifest, drei Icons, zwei MP3s) und zwei Lizenzhinweise. Den **Inhalt** dieses Ordners in das Spielverzeichnis hochladen. Quellcode-Werkzeuge, Tests und Zugangsdaten gehören nicht auf den Webserver. Größen und SHA-256-Hashes stehen in `output/release-report.json`.

Die lokale, von Git ausgeschlossene `ftp.txt` enthält die öffentliche HTTPS-Spieladresse, danach `Server:`, `Username:` und `Passwort:`. Der Deploy-Befehl überträgt ausschließlich die festgelegten Release-Dateien per verschlüsseltem FTPS, prüft jede Datei über HTTPS und veröffentlicht den Worker zuletzt. Er verweigert veraltete oder veränderte Build-Dateien und eine bereits veröffentlichte Cacheversion. Weitere Details: [docs/RELEASE.md](docs/RELEASE.md).

## Technik und Tests

Vanilla JavaScript, Canvas und Web Audio ohne Framework oder Produktionsabhängigkeiten. Die eigene Physik läuft mit 240 festen Teilschritten pro Sekunde und verarbeitet bewegte Flipper, Reibung, Spin und Kugelkollisionen. Der Tisch kombiniert das bereitgestellte Gassenmotiv mit prozedural gezeichneten Spielelementen; Bronx-Seitenhintergrund, M24-Silhouette und PWA-Gestaltung stammen aus dem M24-Slotmachine-Projekt. Die beiden BADBOY-Musikstücke wurden vom Projektinhaber für den Flipper bereitgestellt.

Automatisierte Prüfungen (jede Browser-Suite startet ihren eigenen Server):

```sh
npm install
npx playwright install chromium
npm test
npm run test:responsive
npm run test:rendering
npm run test:startup
npm run test:audio
npm run test:drain
npm run test:touch
npm run test:callouts
npm run test:shooter
npm run test:server
npm run test:pwa
npm run format:check
```

Die Prüfungen decken unter anderem Launcher, Bumper, Multiball, Rampe, Drain, Neustart, Tilt, Touch-Layout, neun Viewport-Größen, natürliche Ballverluste ohne Flipper-Eingabe sowie Offline-Wiedergabe beider Tracks ab. Testbilder und Zustände landen unter `output/` und werden nicht eingecheckt.

Zusätzlich auf einem per USB angeschlossenen **Samsung Galaxy S10e (SM-G970F)** geprüft: echtes Hoch-/Querformat, Browserfenster, natives Vollbild, Feder-Aufzug, gleichzeitige Touch-Flipper und Musikwechsel. Fenster-Viewports unter anderem 360 × 617 / 673 × 280, Vollbild 360 × 760 / 760 × 360 CSS-Pixel. Die automatische Bildschirmdrehung wurde nach den Tests wiederhergestellt.

Die interne Struktur, Physikeinheiten, Test-Schnittstelle und Hinweise zur Wartung sind in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) beschrieben. `npm run format` formatiert die Quellen einheitlich.

## Medien und Herkunft

Das Gassenmotiv für den Flipper-Tisch wurde vom Benutzer für dieses Projekt bereitgestellt.

**meuse24 / M24 GMEU, 2026.** Die ursprünglichen Medienbedingungen bleiben in [MEDIA-LICENSE.md](MEDIA-LICENSE.md) erhalten. Der übernommene PWA-Code stammt aus Lucky Seven; dessen MIT-Hinweis steht in [SLOT-PWA-LICENSE.txt](SLOT-PWA-LICENSE.txt). Die Medienlizenz ist keine allgemeine Freigabe als eigenständiges Asset-Paket.
