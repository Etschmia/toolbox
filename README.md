# tools.martuni.de — Toolbox

Kleine Browser-Werkzeuge, gebaut nach demselben Muster wie
[notes.martuni.de](https://notes.martuni.de) (Vanilla JS/CSS ohne Build,
dependency-freier Node-Server, Caddy davor, Depot Design System).

## Werkzeuge

| Pfad | Was | Server nötig? |
|---|---|---|
| `/qr` | **QR erstellen** aus Text/URL, Bitcoin-URI (BIP-21) oder WLAN-Zugang. Export: PNG in die Zwischenablage, PNG-/SVG-Download. | nein — läuft komplett lokal |
| `/scan` | **QR scannen** per Kamera (Frontkamera gespiegelt, Kamerawahl, Taschenlampe wenn vorhanden), aus Datei, per Einfügen (Strg/⌘ V) oder Drag & Drop. Erkennt Link, otpauth (2FA → Passwort-App), WLAN, Bitcoin/Lightning, mailto/tel/sms, geo, vCard/MECARD (→ .vcf), vEvent (→ .ics), sonstige App-Schemata; `javascript:`/`data:` werden nie verlinkt. Decoder: nativer `BarcodeDetector`, sonst `lib/jsQR.js`. | nein — läuft komplett lokal |
| `/secret` | Geheimnis (Passwort, Text) als selbstvernichtender Link. **Ende-zu-Ende verschlüsselt** (AES-256-GCM im Browser); der Schlüssel steht im URL-Fragment `#…`, das der Browser nie an den Server schickt. Modi: *sofort nach erstem Lesen* oder *N Stunden nach erstem Lesen*; ungeöffnet 7 Tage. Optional zusätzliche Passphrase (PBKDF2, 300k Runden). | ja — speichert nur Chiffrat |
| `/short` | Kurzlinks `tools.martuni.de/<code>`. **Anlegen nur mit Schlüssel** (`TOOLS_KEY` in `.env`), damit der Dienst nicht als Spam-/Phishing-Weiche missbraucht wird. Auflösen ist offen; Aufrufzähler per `/api/short/<code>`. | ja |

Link-Formate: Geheimnisse `/s/<12 Zeichen>#<key>`, Kurzlinks `/<3–32 Zeichen>`.

## Sicherheit / Datenfluss (Geheimnis)

1. Browser erzeugt 32 Zufallsbytes (→ Fragment), verschlüsselt mit AES-GCM,
   `POST /api/secret { ct, iv, mode, hours, pass }`.
2. Server legt `data/<id>.json` (0600) ab. Kein Klartext, kein Schlüssel.
3. Empfänger öffnet `/s/<id>#key` → Bestätigungsseite (Link-Previews von
   Messengern lösen das Öffnen also **nicht** aus) → `POST /api/secret/<id>/open`
   liefert das Chiffrat; bei `once` wird die Datei dabei gelöscht, bei `hours`
   startet die Frist. Entschlüsselung im Browser.
4. Caddy-Log enthält nur `/s/<id>` (nie das Fragment); `Referrer-Policy: no-referrer`.

## Technik

- `server.js` — Node ≥ 20 ohne Abhängigkeiten, Port 8341. API + Kurzlink-Redirects,
  lokal auch statischer Server. Rate-Limit fürs Anlegen (60/h pro IP), Aufräumen alle 15 min.
- `public/` — Seiten `index`, `qr`, `scan`, `secret`, `open` (`/s/*`), `short`;
  `common.js` (Topbar/Theme/Toast/Clipboard), `crypto.js`, `lib/qrcode.js`
  (Kazuhiko Arase, MIT), `lib/jsQR.js` (Cosmo Wolfe, Apache-2.0; nur geladen,
  wenn der Browser keinen `BarcodeDetector` hat, z. B. Firefox).
- `design/` — Kopie der Depot-Tokens (Quelle: `notes/design`).
- `.env` — `TOOLS_KEY=…` (nicht im Repo; wird von der systemd-Unit geladen).

## Entwicklung

```sh
TOOLS_KEY=test node server.js     # http://127.0.0.1:8341
```

## Betrieb

```sh
sudo cp deploy/tools-app.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now tools-app
sudo cp deploy/tools.caddy /etc/caddy/sites/ && sudo systemctl reload caddy
sudo systemctl status tools-app
```
