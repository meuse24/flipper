# Release und Deployment

Die lesbaren Quellen bleiben unverändert nutzbar. Der optionale Build erstellt ein vollständiges, minimiertes Webserver-Paket in `release/`. Die Werkzeugkette entspricht dem Dino-Spiel: Terser für JavaScript, CSSO ohne CSS-Umstrukturierung und HTMLMinifier-Terser für Markup. Eingebettete Bilder, Musik und öffentliche Spiel-Hooks bleiben erhalten.

## Bauen und prüfen

```sh
npm ci
npx playwright install chromium
npm run build
npm run test:release
```

`release/` enthält ausschließlich diese elf Dateien:

```text
index.html
pwa.js
sw.js
manifest.webmanifest
MEDIA-LICENSE.md
SLOT-PWA-LICENSE.txt
assets/icon-180.png
assets/icon-192.png
assets/icon-512.png
assets/lucky-seven-song.mp3
assets/lucky-seven-theme.mp3
```

Den Inhalt direkt im Spielverzeichnis des Webservers bereitstellen, beispielsweise `/apps/flipper/`. Der Ordnername `release` gehört nicht in die öffentliche URL. `output/release-report.json` enthält Größen und SHA-256-Hashes von Quellen und Auslieferungsdateien. `release/`, `output/` und `ftp.txt` sind von Git ausgeschlossen. Unbekannte Dateien im Release-Ordner lassen den Build abbrechen; sie werden weder gelöscht noch hochgeladen.

Die Release-Prüfung vergleicht reproduzierbare Builds, Dateiliste und Hashes, außerdem Start-/Spielansichten und Spielzustände mit der Quelle in drei Ausrichtungen. Der Bildvergleich toleriert Rundungen von höchstens einer Farbstufe an maximal zehn Pixeln pro Ansicht; Spielzustände müssen exakt übereinstimmen. Anschließend laufen Gameplay, alle 22 Drain-Szenarien, neun Viewportgrößen, Offline-Audio sowie Installation und bestätigte Worker-Updates gegen die minimierten Dateien.

Die Medien bleiben unverändert; sie machen fast die gesamte Paketgröße aus. Die Minifizierung reduziert den Code, ohne die Bild- oder Audioqualität zu verändern.

Optional unter PowerShell als ZIP verpacken:

```powershell
Compress-Archive -Path release/* -DestinationPath output/badboy-pinball-v12.zip -Force
```

## FTPS-Upload

Die lokale `ftp.txt` wird mit diesem Format angelegt:

```text
https://example.com/apps/flipper/
Server: ftp.example.com
Username: BENUTZER
Passwort: PASSWORT
```

Auch `/apps/flipper` ohne abschließenden Schrägstrich und `/apps/flipper/index.html` werden als dasselbe Spielverzeichnis erkannt. Die Datei enthält Zugangsdaten und wird nicht eingecheckt oder veröffentlicht.

```sh
npm run deploy -- --dry-run --tls12
npm run deploy -- --tls12
```

Der Probelauf kontrolliert Build-Hashes, aktuelle Quellen und den veröffentlichten Worker. Der Upload nutzt System-curl mit verpflichtender TLS-Verschlüsselung; `--tls12` pinnt TLS 1.2 wie beim Dino-Host. Das Passwort wird ausschließlich über stdin übergeben. Geänderte Quellen erfordern einen neuen Build. Vor jeder geänderten Veröffentlichung die Cachekennung in `sw.js` erhöhen; dieselbe Live-Version wird ohne `--force` nicht überschrieben.

Nur die gemeinsame Allowlist in `scripts/release-files.mjs` wird übertragen. Medien und weitere Voraussetzungen werden zuerst hochgeladen und jeweils per HTTPS/SHA-256 bestätigt; danach HTML, zuletzt der Service Worker. Fehler stoppen den Upload. Bestehende andere Serverdateien bleiben erhalten. Der Build selbst öffnet keine Netzwerkverbindung.

## Release v12

Cache `badboy-pinball-v12` enthält die mobile Rendering-Optimierung, das größere Spielfeld ohne obere/untere Zierrahmen, die Shift-Steuerung, Übersetzungshinweise und Vollbild/Gesang beim ersten Klick. Die unveränderte 240-Hz-Physik wird mit denselben 22 Drain-Szenarien geprüft. Die Release-Suite führt zusätzlich `tests/rendering.mjs` und `tests/startup.mjs` gegen die minimierten Dateien aus. Details und echte S10e-Messungen: [PERFORMANCE.md](PERFORMANCE.md).

## Nachweis einer früheren Veröffentlichung

Am 27. Oktober 2026 wurde Cache `badboy-pinball-v10` über FTPS/TLS 1.2 auf [meuse24.info/apps/flipper/](https://meuse24.info/apps/flipper/) veröffentlicht. Alle elf Dateien wurden über HTTPS per SHA-256 bestätigt. Das Paket umfasst 8.398.125 Bytes; die unveränderten Medien dominieren die Größe. Die vollständige Release-Prüfung bestand. Ein frischer Live-Browser bestätigte Spielstart und Abschuss sowie Offline-Neuladen und MP3-Bytebereiche (HTTP 206), ohne Browserfehler. Lokale Nachweise: `output/release-report.json`, `output/live-release-verification.json` und Screenshots unter `output/`.
