/* Mehrsprachigkeit für die Toolbox: Deutsch, Englisch, Armenisch, Russisch.
   Statische Texte in den HTML-Seiten werden über data-i18n-Attribute befüllt
   (applyI18n), dynamische über t()/tn(). Die Wahl landet im localStorage;
   ohne Wahl gilt die Browser-Sprache, sonst Deutsch.
   Beim Wechsel feuert `langchange` auf document, damit Seiten dynamische
   Texte neu aufbauen können. */
'use strict';

const I18N = (() => {
  const LS_LANG = 'tools.martuni.lang';
  const LANGS = ['de', 'en', 'hy', 'ru'];
  const NAMES = { de: 'Deutsch', en: 'English', hy: 'Հայերեն', ru: 'Русский' };
  const LOCALES = { de: 'de-DE', en: 'en-GB', hy: 'hy-AM', ru: 'ru-RU' };

  const de = {
    // gemeinsam
    'brand': 'Toolbox',
    'nav.qr': 'QR erstellen', 'nav.scan': 'QR scannen', 'nav.secret': 'Geheimnis', 'nav.short': 'Kurzlink',
    'theme': 'Hell / Dunkel umschalten', 'language': 'Sprache', 'notes': 'Notizen',
    'copied': 'Kopiert', 'copy': 'Kopieren', 'copyFail': 'Kopieren nicht möglich',
    'unknownErr': 'Unbekannter Fehler', 'errStatus': 'Fehler {n}',
    'hours_one': '{n} Stunde', 'hours_other': '{n} Stunden',
    'days_one': '{n} Tag', 'days_other': '{n} Tage',
    // API-Fehlercodes (server.js)
    'api.too_large': 'Zu groß (max. 256 KB)', 'api.bad_json': 'Ungültiges JSON',
    'api.rate_limited': 'Zu viele Anfragen — später erneut versuchen', 'api.bad_payload': 'Ungültige Anfrage',
    'api.bad_hours': 'Frist zwischen 0,25 und {max} Stunden', 'api.gone': 'Unbekannt, abgelaufen oder bereits gelesen',
    'api.bad_key': 'Schlüssel fehlt oder ist falsch', 'api.bad_url': 'Bitte eine http(s)-Adresse angeben',
    'api.bad_code': 'Wunschkürzel: 3–32 Zeichen, a–z A–Z 0–9 _ -', 'api.code_taken': 'Kürzel ist schon vergeben',
    'api.unknown_code': 'Unbekanntes Kürzel',

    // Startseite
    'index.title': 'Toolbox · tools.martuni.de',
    'index.lead': 'Kleine Werkzeuge, die im Browser laufen. Nichts davon braucht ein Konto.',
    'index.qr': 'Aus URL, Text oder Bitcoin-Adresse. Als Bild in die Zwischenablage oder als PNG/SVG herunterladen. Läuft komplett lokal.',
    'index.scan': 'Mit der Kamera, aus einem Screenshot oder per Einfügen. Links öffnen, WLAN-Passwort kopieren, TOTP an die Passwort-App übergeben, Kontakte speichern.',
    'index.secret': 'Passwort oder Text als Einmal-Link verschicken. Verschwindet nach dem ersten Lesen oder nach einer Frist. Ende-zu-Ende verschlüsselt.',
    'index.short': 'Lange Adresse → <span class="mono">tools.martuni.de/abc123</span>. Anlegen nur mit Schlüssel, damit der Dienst nicht für Spam missbraucht wird.',

    // QR erstellen
    'qr.title': 'QR erstellen · Toolbox',
    'qr.lead': 'Wird vollständig im Browser erzeugt — die Eingabe verlässt dieses Gerät nicht.',
    'qr.kind': 'Art', 'qr.kindText': 'Text / URL', 'qr.kindWifi': 'WLAN',
    'qr.content': 'Inhalt', 'qr.contentPh': 'https://… oder beliebiger Text',
    'qr.addr': 'Adresse', 'qr.amount': 'Betrag (BTC, optional)', 'qr.label': 'Bezeichnung (optional)', 'qr.labelPh': 'z. B. Spende',
    'qr.bip21': 'Ergibt einen <span class="mono">bitcoin:</span>-URI (BIP-21), den Wallets direkt öffnen.',
    'qr.ssid': 'Netzname (SSID)', 'qr.enc': 'Verschlüsselung', 'qr.open': 'offen', 'qr.pass': 'Passwort', 'qr.hidden': 'verstecktes Netz',
    'qr.display': 'Darstellung', 'qr.ecl': 'Fehlerkorrektur',
    'qr.eclL': '~7 % — kleinster Code', 'qr.eclM': '~15 %', 'qr.eclQ': '~25 %', 'qr.eclH': '~30 % — robust, z. B. bei Aufdruck',
    'qr.size': 'Bildgröße (Export)', 'qr.margin': 'Rand (Module)', 'qr.preview': 'QR-Code-Vorschau',
    'qr.empty': 'Gib etwas ein …', 'qr.copyImg': 'Bild kopieren', 'qr.copyText': 'Kodierten Text kopieren',
    'qr.tooLong': 'Zu lang für einen QR-Code ({n} Zeichen)',
    'qr.meta': 'Version {v} · {n}×{n} Module · {len} Zeichen · Korrektur {ecl}',
    'qr.imgCopied': 'Bild in die Zwischenablage kopiert', 'qr.imgCopyFail': 'Bild kopieren nicht möglich — nutze PNG', 'qr.textCopied': 'Text kopiert',

    // QR scannen
    'scan.title': 'QR scannen · Toolbox',
    'scan.lead': 'Kamera vor den Code halten — oder einen Screenshot einfügen (Strg/⌘ V), hierher ziehen oder auswählen. Alles wird lokal im Browser ausgewertet.',
    'scan.starting': 'Kamera wird gestartet …', 'scan.start': 'Kamera starten', 'scan.stop': 'Kamera stoppen', 'scan.again': 'Weiter scannen',
    'scan.pickCam': 'Kamera wählen', 'scan.torch': 'Licht', 'scan.pickImg': 'Bild wählen …', 'scan.raw': 'Rohinhalt',
    'scan.nothing': 'Noch nichts gescannt.',
    'scan.macTip': 'Tipp auf dem MacBook: Screenshot mit <span class="mono">⌘ ⇧ 4</span> in die Zwischenablage (Ctrl gedrückt halten), dann hier <span class="mono">⌘ V</span>.',
    'scan.recent': 'Zuletzt gescannt',
    'scan.engineNative': 'Erkennung: Browser-eigener Decoder.', 'scan.engineJsqr': 'Erkennung: jsQR (lokal im Browser).',
    'scan.noCamApi': 'Dieser Browser bietet keinen Kamerazugriff. Bild einfügen oder auswählen funktioniert trotzdem.',
    'scan.noHttps': 'Kamerazugriff geht nur über HTTPS. Bild einfügen oder auswählen funktioniert trotzdem.',
    'scan.denied': 'Kamerazugriff wurde abgelehnt. In den Browser-Einstellungen für diese Seite erlauben, dann erneut starten.',
    'scan.noCam': 'Keine Kamera gefunden. Bild einfügen oder auswählen funktioniert trotzdem.',
    'scan.busy': 'Die Kamera wird gerade von einer anderen App benutzt.',
    'scan.failed': 'Kamera konnte nicht gestartet werden ({name}).', 'scan.camN': 'Kamera {n}',
    'scan.hit': 'Code erkannt', 'scan.srcCamera': 'Kamera', 'scan.srcFile': 'Datei', 'scan.srcClipboard': 'Zwischenablage',
    'scan.notImage': 'Das ist kein Bild', 'scan.unreadable': 'Bild konnte nicht gelesen werden', 'scan.notFound': 'Kein QR-Code im Bild gefunden',
    'scan.torchNA': 'Licht nicht verfügbar', 'scan.decoderFail': 'Decoder konnte nicht geladen werden: {msg}',
    'scan.asQr': 'Als QR erstellen', 'scan.asQrTitle': 'Diesen Inhalt als neuen QR-Code erzeugen', 'scan.rawCopy': 'Rohinhalt kopieren',
    // Typen
    'type.link': 'Link', 'type.otp': 'Einmalpasswort (2FA)', 'type.authExport': 'Authenticator-Export', 'type.wifi': 'WLAN-Zugang',
    'type.payment': '{name}-Zahlung', 'type.email': 'E-Mail', 'type.phone': 'Telefonnummer', 'type.sms': 'SMS', 'type.place': 'Ort',
    'type.contact': 'Kontakt', 'type.event': 'Termin', 'type.app': 'App-Link ({scheme}:)', 'type.bareUrl': 'Adresse ohne https://',
    'type.number': 'Zahl / Code', 'type.text': 'Text',
    // Felder
    'f.address': 'Adresse', 'f.service': 'Dienst', 'f.account': 'Konto', 'f.type': 'Typ', 'f.content': 'Inhalt',
    'f.migration': 'Google-Authenticator-Übertragung (mehrere Konten)', 'f.ssid': 'Netz (SSID)', 'f.enc': 'Verschlüsselung', 'f.open': 'offen',
    'f.password': 'Passwort', 'f.hiddenNet': 'Verstecktes Netz', 'f.yes': 'ja', 'f.amount': 'Betrag', 'f.label': 'Bezeichnung', 'f.message': 'Nachricht',
    'f.to': 'An', 'f.subject': 'Betreff', 'f.text': 'Text', 'f.number': 'Nummer', 'f.coords': 'Koordinaten', 'f.search': 'Suche',
    'f.name': 'Name', 'f.org': 'Organisation', 'f.phone': 'Telefon', 'f.email': 'E-Mail', 'f.web': 'Web',
    'f.title': 'Titel', 'f.begin': 'Beginn', 'f.end': 'Ende', 'f.location': 'Ort',
    // Aktionen
    'a.open': 'Öffnen', 'a.copyLink': 'Link kopieren', 'a.openPassApp': 'In Passwort-App öffnen', 'a.copyKey': 'Schlüssel kopieren',
    'a.copyOtp': 'otpauth-URI kopieren', 'a.openAuth': 'In Authenticator öffnen', 'a.copyUri': 'URI kopieren', 'a.copyPass': 'Passwort kopieren',
    'a.copySsid': 'SSID kopieren', 'a.openWallet': 'In Wallet öffnen', 'a.copyAddr': 'Adresse kopieren', 'a.writeEmail': 'E-Mail schreiben',
    'a.call': 'Anrufen', 'a.copyNumber': 'Nummer kopieren', 'a.writeSms': 'Nachricht schreiben', 'a.openMap': 'Karte öffnen',
    'a.copyCoords': 'Koordinaten kopieren', 'a.addContact': 'Zu Kontakten hinzufügen',
    'a.contactHint': 'Lädt eine .vcf-Datei — Öffnen fügt den Kontakt in Kontakte/Outlook ein.',
    'a.copyPhone': 'Telefon kopieren', 'a.copyEmail': 'E-Mail kopieren', 'a.addCalendar': 'In Kalender übernehmen',
    'a.calendarHint': 'Lädt eine .ics-Datei — Öffnen legt den Termin im Kalender an.', 'a.openApp': 'Mit App öffnen',
    // Hinweise
    'n.phishing': 'Achtung: Die Adresse enthält einen Benutzernamen vor dem @ — typisch für Phishing.',
    'n.punycode': 'Achtung: Der Hostname nutzt Sonderzeichen (Punycode) — genau hinsehen.',
    'n.otp': 'Der geheime Schlüssel bleibt hier im Browser. „In Passwort-App öffnen" übergibt ihn an Apple Passwörter / Schlüsselbund, 1Password, Bitwarden, Authenticator o. ä.',
    'n.wifiMac': 'Auf dem Mac: WLAN-Menü → Netz wählen → Passwort einfügen. iPhone/iPad erkennen solche Codes direkt in der Kamera-App.',
    'n.unknownScheme': 'Unbekanntes Schema — „Mit App öffnen" reicht die Adresse ans System weiter; eine passende App muss installiert sein.',

    // Geheimnis teilen
    'secret.title': 'Geheimnis · Toolbox', 'secret.h1': 'Geheimnis teilen',
    'secret.lead': 'Ein Passwort oder Text als Link verschicken, der sich selbst vernichtet. Verschlüsselt im Browser — der Server sieht nur Datensalat, der Schlüssel steckt im Link hinter dem <span class="mono">#</span>.',
    'secret.label': 'Geheimnis', 'secret.ph': 'Passwort, Zugangsdaten, Text …', 'secret.max': 'max. ~100 KB Text',
    'secret.destroy': 'Vernichten', 'secret.once': 'sofort nach dem ersten Lesen', 'secret.hours': 'nach Frist ab erstem Lesen',
    'secret.deadline': 'Frist nach dem ersten Öffnen',
    'secret.deadlineHint': 'Solange kann der Link mehrfach geöffnet werden — z. B. wenn der Empfänger ihn erst am Handy, dann am Rechner braucht.',
    'secret.passLabel': 'Zusätzliche Passphrase (optional)', 'secret.passPh': 'wird auf anderem Weg mitgeteilt, z. B. per Telefon',
    'secret.passHint': 'Damit reicht der Link allein nicht mehr zum Lesen. Wer den Link abfängt, sieht trotzdem nichts.',
    'secret.unopened': 'Ungeöffnete Geheimnisse werden nach 7 Tagen gelöscht.',
    'secret.create': 'Link erzeugen', 'secret.ready': 'Link ist fertig', 'secret.asQr': 'Als QR-Code', 'secret.burn': 'Jetzt vernichten', 'secret.new': 'Neues Geheimnis',
    'secret.tooLong': 'Zu lang (max. ~100 KB)', 'secret.encrypting': 'Verschlüssele …',
    'secret.onceHint': 'Der Link funktioniert genau einmal. Ungeöffnet verfällt er nach 7 Tagen.',
    'secret.hoursHint': 'Nach dem ersten Öffnen bleibt der Link {span} lesbar, dann wird er gelöscht. Ungeöffnet verfällt er nach 7 Tagen.',
    'secret.passSeparately': 'Die Passphrase bitte getrennt mitteilen.',
    'secret.linkCopied': 'Link kopiert', 'secret.burned': 'Vernichtet', 'secret.deleted': '— gelöscht —',

    // Geheimnis öffnen
    'open.h1': 'Geheimnis', 'open.lead': 'Jemand hat dir etwas Vertrauliches geschickt.', 'open.checking': 'Prüfe Link …',
    'open.pass': 'Passphrase', 'open.passPh': 'wurde dir getrennt mitgeteilt', 'open.show': 'Geheimnis anzeigen',
    'open.tip': 'Tipp: Speichere den Inhalt in deinem Passwort-Manager, statt diese Seite offen zu lassen.',
    'open.gone': 'Dieses Geheimnis gibt es nicht (mehr): Der Link ist ungültig, abgelaufen oder wurde bereits gelesen. Bitte den Absender um einen neuen Link.',
    'open.share': 'Selbst ein Geheimnis teilen',
    'open.onceNote': '<b>Nur einmal lesbar.</b> Sobald du auf „Anzeigen" klickst, wird das Geheimnis vom Server gelöscht. Danach kann es niemand mehr öffnen — auch du nicht. Bereit?',
    'open.openedNote': 'Dieses Geheimnis wurde bereits geöffnet und ist noch bis <b>{date}</b> lesbar.',
    'open.deadlineNote': '<b>Frist startet beim Öffnen.</b> Ab dem ersten Anzeigen bleibt das Geheimnis {span} lesbar, danach wird es gelöscht.',
    'open.needPass': 'Bitte die Passphrase eingeben.',
    'open.decryptFailOnce': 'Entschlüsselung fehlgeschlagen — Passphrase falsch? Bitte erneut versuchen und diese Seite dabei nicht neu laden.',
    'open.decryptFail': 'Entschlüsselung fehlgeschlagen — Passphrase falsch?', 'open.err': 'Fehler: {msg}',
    'open.burnedNote': 'Das Geheimnis wurde vom Server gelöscht. Es existiert jetzt nur noch hier auf deinem Bildschirm.',
    'open.readableUntil': 'Lesbar bis <b>{date}</b> (<span class="countdown" id="cd"></span>). Danach wird es gelöscht.',
    'open.remaining': 'noch {time}', 'open.burnedShort': 'Vom Server gelöscht. Existiert nur noch hier auf deinem Bildschirm.',

    // Kurzlink
    'short.title': 'Kurzlink · Toolbox', 'short.h1': 'Kurzlink',
    'short.lead': 'Lange Adresse → <span class="mono">tools.martuni.de/abc123</span>. Zum Anlegen brauchst du den Schlüssel; Aufrufen kann jeder.',
    'short.target': 'Ziel-Adresse', 'short.code': 'Wunschkürzel (optional)', 'short.codePh': 'sonst zufällig, 6 Zeichen',
    'short.key': 'Schlüssel', 'short.keyPh': 'wird in diesem Browser gemerkt', 'short.create': 'Kurzlink anlegen',
    'short.lookup': 'Nachschlagen', 'short.codeLabel': 'Kürzel', 'short.check': 'Prüfen',
    'short.noKey': 'Ohne Schlüssel geht es nicht.', 'short.copied': 'Kurzlink kopiert', 'short.notFound': 'Kein Kurzlink mit diesem Kürzel.',
    'short.hits_one': '{n} Aufruf', 'short.hits_other': '{n} Aufrufe', 'short.created': 'angelegt {date}', 'short.last': 'zuletzt {date}',
  };

  const en = {
    'brand': 'Toolbox',
    'nav.qr': 'Create QR', 'nav.scan': 'Scan QR', 'nav.secret': 'Secret', 'nav.short': 'Short link',
    'theme': 'Toggle light / dark', 'language': 'Language', 'notes': 'Notes',
    'copied': 'Copied', 'copy': 'Copy', 'copyFail': 'Copying not possible',
    'unknownErr': 'Unknown error', 'errStatus': 'Error {n}',
    'hours_one': '{n} hour', 'hours_other': '{n} hours',
    'days_one': '{n} day', 'days_other': '{n} days',
    'api.too_large': 'Too large (max. 256 KB)', 'api.bad_json': 'Invalid JSON',
    'api.rate_limited': 'Too many requests — try again later', 'api.bad_payload': 'Invalid request',
    'api.bad_hours': 'Deadline between 0.25 and {max} hours', 'api.gone': 'Unknown, expired or already read',
    'api.bad_key': 'Key missing or wrong', 'api.bad_url': 'Please enter an http(s) address',
    'api.bad_code': 'Custom code: 3–32 characters, a–z A–Z 0–9 _ -', 'api.code_taken': 'Code is already taken',
    'api.unknown_code': 'Unknown code',

    'index.title': 'Toolbox · tools.martuni.de',
    'index.lead': 'Small tools that run in the browser. None of them needs an account.',
    'index.qr': 'From a URL, text or Bitcoin address. Copy as an image to the clipboard or download as PNG/SVG. Runs entirely locally.',
    'index.scan': 'With the camera, from a screenshot or by pasting. Open links, copy Wi-Fi passwords, hand TOTP to your password app, save contacts.',
    'index.secret': 'Send a password or text as a one-time link. Disappears after the first read or after a deadline. End-to-end encrypted.',
    'index.short': 'Long address → <span class="mono">tools.martuni.de/abc123</span>. Creating requires a key so the service cannot be abused for spam.',

    'qr.title': 'Create QR · Toolbox',
    'qr.lead': 'Generated entirely in the browser — your input never leaves this device.',
    'qr.kind': 'Type', 'qr.kindText': 'Text / URL', 'qr.kindWifi': 'Wi-Fi',
    'qr.content': 'Content', 'qr.contentPh': 'https://… or any text',
    'qr.addr': 'Address', 'qr.amount': 'Amount (BTC, optional)', 'qr.label': 'Label (optional)', 'qr.labelPh': 'e.g. donation',
    'qr.bip21': 'Produces a <span class="mono">bitcoin:</span> URI (BIP-21) that wallets open directly.',
    'qr.ssid': 'Network name (SSID)', 'qr.enc': 'Encryption', 'qr.open': 'open', 'qr.pass': 'Password', 'qr.hidden': 'hidden network',
    'qr.display': 'Appearance', 'qr.ecl': 'Error correction',
    'qr.eclL': '~7 % — smallest code', 'qr.eclM': '~15 %', 'qr.eclQ': '~25 %', 'qr.eclH': '~30 % — robust, e.g. for print',
    'qr.size': 'Image size (export)', 'qr.margin': 'Margin (modules)', 'qr.preview': 'QR code preview',
    'qr.empty': 'Type something …', 'qr.copyImg': 'Copy image', 'qr.copyText': 'Copy encoded text',
    'qr.tooLong': 'Too long for a QR code ({n} characters)',
    'qr.meta': 'Version {v} · {n}×{n} modules · {len} characters · correction {ecl}',
    'qr.imgCopied': 'Image copied to clipboard', 'qr.imgCopyFail': 'Cannot copy image — use PNG', 'qr.textCopied': 'Text copied',

    'scan.title': 'Scan QR · Toolbox',
    'scan.lead': 'Hold the camera in front of the code — or paste a screenshot (Ctrl/⌘ V), drop it here or pick a file. Everything is processed locally in the browser.',
    'scan.starting': 'Starting camera …', 'scan.start': 'Start camera', 'scan.stop': 'Stop camera', 'scan.again': 'Scan again',
    'scan.pickCam': 'Choose camera', 'scan.torch': 'Light', 'scan.pickImg': 'Choose image …', 'scan.raw': 'Raw content',
    'scan.nothing': 'Nothing scanned yet.',
    'scan.macTip': 'Tip on a MacBook: take a screenshot with <span class="mono">⌘ ⇧ 4</span> to the clipboard (hold Ctrl), then press <span class="mono">⌘ V</span> here.',
    'scan.recent': 'Recently scanned',
    'scan.engineNative': 'Detection: browser-native decoder.', 'scan.engineJsqr': 'Detection: jsQR (locally in the browser).',
    'scan.noCamApi': 'This browser offers no camera access. Pasting or choosing an image still works.',
    'scan.noHttps': 'Camera access requires HTTPS. Pasting or choosing an image still works.',
    'scan.denied': 'Camera access was denied. Allow it for this site in the browser settings, then start again.',
    'scan.noCam': 'No camera found. Pasting or choosing an image still works.',
    'scan.busy': 'The camera is currently used by another app.',
    'scan.failed': 'Camera could not be started ({name}).', 'scan.camN': 'Camera {n}',
    'scan.hit': 'Code detected', 'scan.srcCamera': 'camera', 'scan.srcFile': 'file', 'scan.srcClipboard': 'clipboard',
    'scan.notImage': 'That is not an image', 'scan.unreadable': 'Image could not be read', 'scan.notFound': 'No QR code found in the image',
    'scan.torchNA': 'Light not available', 'scan.decoderFail': 'Decoder could not be loaded: {msg}',
    'scan.asQr': 'Create as QR', 'scan.asQrTitle': 'Generate a new QR code from this content', 'scan.rawCopy': 'Copy raw content',
    'type.link': 'Link', 'type.otp': 'One-time password (2FA)', 'type.authExport': 'Authenticator export', 'type.wifi': 'Wi-Fi access',
    'type.payment': '{name} payment', 'type.email': 'E-mail', 'type.phone': 'Phone number', 'type.sms': 'SMS', 'type.place': 'Place',
    'type.contact': 'Contact', 'type.event': 'Event', 'type.app': 'App link ({scheme}:)', 'type.bareUrl': 'Address without https://',
    'type.number': 'Number / code', 'type.text': 'Text',
    'f.address': 'Address', 'f.service': 'Service', 'f.account': 'Account', 'f.type': 'Type', 'f.content': 'Content',
    'f.migration': 'Google Authenticator transfer (multiple accounts)', 'f.ssid': 'Network (SSID)', 'f.enc': 'Encryption', 'f.open': 'open',
    'f.password': 'Password', 'f.hiddenNet': 'Hidden network', 'f.yes': 'yes', 'f.amount': 'Amount', 'f.label': 'Label', 'f.message': 'Message',
    'f.to': 'To', 'f.subject': 'Subject', 'f.text': 'Text', 'f.number': 'Number', 'f.coords': 'Coordinates', 'f.search': 'Search',
    'f.name': 'Name', 'f.org': 'Organisation', 'f.phone': 'Phone', 'f.email': 'E-mail', 'f.web': 'Web',
    'f.title': 'Title', 'f.begin': 'Start', 'f.end': 'End', 'f.location': 'Location',
    'a.open': 'Open', 'a.copyLink': 'Copy link', 'a.openPassApp': 'Open in password app', 'a.copyKey': 'Copy key',
    'a.copyOtp': 'Copy otpauth URI', 'a.openAuth': 'Open in Authenticator', 'a.copyUri': 'Copy URI', 'a.copyPass': 'Copy password',
    'a.copySsid': 'Copy SSID', 'a.openWallet': 'Open in wallet', 'a.copyAddr': 'Copy address', 'a.writeEmail': 'Write e-mail',
    'a.call': 'Call', 'a.copyNumber': 'Copy number', 'a.writeSms': 'Write message', 'a.openMap': 'Open map',
    'a.copyCoords': 'Copy coordinates', 'a.addContact': 'Add to contacts',
    'a.contactHint': 'Downloads a .vcf file — opening it adds the contact to Contacts/Outlook.',
    'a.copyPhone': 'Copy phone', 'a.copyEmail': 'Copy e-mail', 'a.addCalendar': 'Add to calendar',
    'a.calendarHint': 'Downloads an .ics file — opening it creates the event in your calendar.', 'a.openApp': 'Open with app',
    'n.phishing': 'Warning: the address contains a username before the @ — typical for phishing.',
    'n.punycode': 'Warning: the hostname uses special characters (Punycode) — look closely.',
    'n.otp': 'The secret key stays here in the browser. "Open in password app" hands it to Apple Passwords / Keychain, 1Password, Bitwarden, Authenticator etc.',
    'n.wifiMac': 'On the Mac: Wi-Fi menu → choose network → paste password. iPhone/iPad recognise such codes directly in the Camera app.',
    'n.unknownScheme': 'Unknown scheme — "Open with app" passes the address to the system; a matching app must be installed.',

    'secret.title': 'Secret · Toolbox', 'secret.h1': 'Share a secret',
    'secret.lead': 'Send a password or text as a self-destructing link. Encrypted in the browser — the server only sees gibberish, the key sits in the link after the <span class="mono">#</span>.',
    'secret.label': 'Secret', 'secret.ph': 'Password, credentials, text …', 'secret.max': 'max. ~100 KB of text',
    'secret.destroy': 'Destroy', 'secret.once': 'immediately after the first read', 'secret.hours': 'after a deadline from the first read',
    'secret.deadline': 'Deadline after the first opening',
    'secret.deadlineHint': 'During that time the link can be opened several times — e.g. if the recipient needs it first on the phone, then on the computer.',
    'secret.passLabel': 'Additional passphrase (optional)', 'secret.passPh': 'shared by another channel, e.g. by phone',
    'secret.passHint': 'Then the link alone is no longer enough to read it. Anyone intercepting the link still sees nothing.',
    'secret.unopened': 'Unopened secrets are deleted after 7 days.',
    'secret.create': 'Create link', 'secret.ready': 'Link is ready', 'secret.asQr': 'As QR code', 'secret.burn': 'Destroy now', 'secret.new': 'New secret',
    'secret.tooLong': 'Too long (max. ~100 KB)', 'secret.encrypting': 'Encrypting …',
    'secret.onceHint': 'The link works exactly once. Unopened, it expires after 7 days.',
    'secret.hoursHint': 'After the first opening the link stays readable for {span}, then it is deleted. Unopened, it expires after 7 days.',
    'secret.passSeparately': 'Please share the passphrase separately.',
    'secret.linkCopied': 'Link copied', 'secret.burned': 'Destroyed', 'secret.deleted': '— deleted —',

    'open.h1': 'Secret', 'open.lead': 'Someone sent you something confidential.', 'open.checking': 'Checking link …',
    'open.pass': 'Passphrase', 'open.passPh': 'was shared with you separately', 'open.show': 'Show secret',
    'open.tip': 'Tip: save the content in your password manager instead of leaving this page open.',
    'open.gone': 'This secret does not exist (any more): the link is invalid, expired or has already been read. Ask the sender for a new link.',
    'open.share': 'Share a secret yourself',
    'open.onceNote': '<b>Readable only once.</b> As soon as you click "Show", the secret is deleted from the server. After that nobody can open it — not even you. Ready?',
    'open.openedNote': 'This secret has already been opened and stays readable until <b>{date}</b>.',
    'open.deadlineNote': '<b>The deadline starts on opening.</b> From the first display the secret stays readable for {span}, then it is deleted.',
    'open.needPass': 'Please enter the passphrase.',
    'open.decryptFailOnce': 'Decryption failed — wrong passphrase? Please try again without reloading this page.',
    'open.decryptFail': 'Decryption failed — wrong passphrase?', 'open.err': 'Error: {msg}',
    'open.burnedNote': 'The secret has been deleted from the server. It now exists only here on your screen.',
    'open.readableUntil': 'Readable until <b>{date}</b> (<span class="countdown" id="cd"></span>). Then it is deleted.',
    'open.remaining': '{time} left', 'open.burnedShort': 'Deleted from the server. Exists only here on your screen.',

    'short.title': 'Short link · Toolbox', 'short.h1': 'Short link',
    'short.lead': 'Long address → <span class="mono">tools.martuni.de/abc123</span>. Creating requires the key; anyone can open it.',
    'short.target': 'Target address', 'short.code': 'Custom code (optional)', 'short.codePh': 'otherwise random, 6 characters',
    'short.key': 'Key', 'short.keyPh': 'remembered in this browser', 'short.create': 'Create short link',
    'short.lookup': 'Look up', 'short.codeLabel': 'Code', 'short.check': 'Check',
    'short.noKey': 'It does not work without the key.', 'short.copied': 'Short link copied', 'short.notFound': 'No short link with this code.',
    'short.hits_one': '{n} hit', 'short.hits_other': '{n} hits', 'short.created': 'created {date}', 'short.last': 'last {date}',
  };

  const hy = {
    'brand': 'Toolbox',
    'nav.qr': 'Ստեղծել QR', 'nav.scan': 'Սկանավորել QR', 'nav.secret': 'Գաղտնիք', 'nav.short': 'Կարճ հղում',
    'theme': 'Բաց / մուգ թեմա', 'language': 'Լեզու', 'notes': 'Նշումներ',
    'copied': 'Պատճենվեց', 'copy': 'Պատճենել', 'copyFail': 'Պատճենել հնարավոր չէ',
    'unknownErr': 'Անհայտ սխալ', 'errStatus': 'Սխալ {n}',
    'hours_one': '{n} ժամ', 'hours_other': '{n} ժամ',
    'days_one': '{n} օր', 'days_other': '{n} օր',
    'api.too_large': 'Չափազանց մեծ է (առավելագույնը 256 ԿԲ)', 'api.bad_json': 'Անվավեր JSON',
    'api.rate_limited': 'Չափազանց շատ հարցումներ — փորձեք ավելի ուշ', 'api.bad_payload': 'Անվավեր հարցում',
    'api.bad_hours': 'Ժամկետը՝ 0,25-ից {max} ժամ', 'api.gone': 'Անհայտ է, ժամկետանց է կամ արդեն կարդացվել է',
    'api.bad_key': 'Բանալին բացակայում է կամ սխալ է', 'api.bad_url': 'Խնդրում ենք նշել http(s) հասցե',
    'api.bad_code': 'Ցանկալի կոդ՝ 3–32 նիշ, a–z A–Z 0–9 _ -', 'api.code_taken': 'Կոդն արդեն զբաղված է',
    'api.unknown_code': 'Անհայտ կոդ',

    'index.title': 'Toolbox · tools.martuni.de',
    'index.lead': 'Փոքր գործիքներ, որոնք աշխատում են դիտարկիչում։ Դրանցից ոչ մեկը հաշիվ չի պահանջում։',
    'index.qr': 'URL-ից, տեքստից կամ Bitcoin հասցեից։ Որպես նկար՝ սեղմատախտակ, կամ ներբեռնել որպես PNG/SVG։ Աշխատում է ամբողջությամբ տեղում։',
    'index.scan': 'Տեսախցիկով, սքրինշոթից կամ տեղադրելով։ Բացել հղումներ, պատճենել Wi-Fi գաղտնաբառ, TOTP-ն փոխանցել գաղտնաբառերի հավելվածին, պահել կոնտակտներ։',
    'index.secret': 'Ուղարկել գաղտնաբառ կամ տեքստ որպես մեկանգամյա հղում։ Անհետանում է առաջին ընթերցումից կամ ժամկետից հետո։ Ծայրից ծայր գաղտնագրված։',
    'index.short': 'Երկար հասցե → <span class="mono">tools.martuni.de/abc123</span>։ Ստեղծելը միայն բանալիով, որպեսզի ծառայությունը սպամի համար չչարաշահվի։',

    'qr.title': 'Ստեղծել QR · Toolbox',
    'qr.lead': 'Ամբողջությամբ ստեղծվում է դիտարկիչում — մուտքագրածը այս սարքից դուրս չի գալիս։',
    'qr.kind': 'Տեսակ', 'qr.kindText': 'Տեքստ / URL', 'qr.kindWifi': 'Wi-Fi',
    'qr.content': 'Բովանդակություն', 'qr.contentPh': 'https://… կամ ցանկացած տեքստ',
    'qr.addr': 'Հասցե', 'qr.amount': 'Գումար (BTC, ըստ ցանկության)', 'qr.label': 'Անվանում (ըստ ցանկության)', 'qr.labelPh': 'օր.՝ նվիրատվություն',
    'qr.bip21': 'Ստացվում է <span class="mono">bitcoin:</span> URI (BIP-21), որը դրամապանակներն անմիջապես բացում են։',
    'qr.ssid': 'Ցանցի անուն (SSID)', 'qr.enc': 'Գաղտնագրում', 'qr.open': 'բաց', 'qr.pass': 'Գաղտնաբառ', 'qr.hidden': 'թաքնված ցանց',
    'qr.display': 'Տեսք', 'qr.ecl': 'Սխալների ուղղում',
    'qr.eclL': '~7 % — ամենափոքր կոդը', 'qr.eclM': '~15 %', 'qr.eclQ': '~25 %', 'qr.eclH': '~30 % — կայուն, օր.՝ տպագրության համար',
    'qr.size': 'Նկարի չափ (արտահանում)', 'qr.margin': 'Եզր (մոդուլներ)', 'qr.preview': 'QR կոդի նախադիտում',
    'qr.empty': 'Մուտքագրեք ինչ-որ բան …', 'qr.copyImg': 'Պատճենել նկարը', 'qr.copyText': 'Պատճենել կոդավորված տեքստը',
    'qr.tooLong': 'Չափազանց երկար է QR կոդի համար ({n} նիշ)',
    'qr.meta': 'Տարբերակ {v} · {n}×{n} մոդուլ · {len} նիշ · ուղղում {ecl}',
    'qr.imgCopied': 'Նկարը պատճենվեց սեղմատախտակ', 'qr.imgCopyFail': 'Նկարը պատճենել հնարավոր չէ — օգտագործեք PNG', 'qr.textCopied': 'Տեքստը պատճենվեց',

    'scan.title': 'Սկանավորել QR · Toolbox',
    'scan.lead': 'Պահեք տեսախցիկը կոդի առջև — կամ տեղադրեք սքրինշոթ (Ctrl/⌘ V), քաշեք այստեղ կամ ընտրեք ֆայլ։ Ամեն ինչ մշակվում է տեղում՝ դիտարկիչում։',
    'scan.starting': 'Տեսախցիկը միանում է …', 'scan.start': 'Միացնել տեսախցիկը', 'scan.stop': 'Անջատել տեսախցիկը', 'scan.again': 'Շարունակել սկանավորումը',
    'scan.pickCam': 'Ընտրել տեսախցիկ', 'scan.torch': 'Լույս', 'scan.pickImg': 'Ընտրել նկար …', 'scan.raw': 'Հում բովանդակություն',
    'scan.nothing': 'Դեռ ոչինչ չի սկանավորվել։',
    'scan.macTip': 'Խորհուրդ MacBook-ի համար՝ սքրինշոթ <span class="mono">⌘ ⇧ 4</span>-ով սեղմատախտակ (պահած Ctrl), ապա այստեղ <span class="mono">⌘ V</span>։',
    'scan.recent': 'Վերջին սկանավորումները',
    'scan.engineNative': 'Ճանաչում՝ դիտարկիչի սեփական ապակոդավորիչ։', 'scan.engineJsqr': 'Ճանաչում՝ jsQR (տեղում՝ դիտարկիչում)։',
    'scan.noCamApi': 'Այս դիտարկիչը տեսախցիկի հասանելիություն չի տրամադրում։ Նկար տեղադրելը կամ ընտրելը այնուամենայնիվ աշխատում է։',
    'scan.noHttps': 'Տեսախցիկի հասանելիությունը միայն HTTPS-ով է։ Նկար տեղադրելը կամ ընտրելը այնուամենայնիվ աշխատում է։',
    'scan.denied': 'Տեսախցիկի հասանելիությունը մերժվել է։ Թույլատրեք այս կայքի համար դիտարկիչի կարգավորումներում, ապա նորից միացրեք։',
    'scan.noCam': 'Տեսախցիկ չի գտնվել։ Նկար տեղադրելը կամ ընտրելը այնուամենայնիվ աշխատում է։',
    'scan.busy': 'Տեսախցիկն այս պահին օգտագործվում է այլ հավելվածի կողմից։',
    'scan.failed': 'Տեսախցիկը միացնել չհաջողվեց ({name})։', 'scan.camN': 'Տեսախցիկ {n}',
    'scan.hit': 'Կոդը ճանաչվեց', 'scan.srcCamera': 'տեսախցիկ', 'scan.srcFile': 'ֆայլ', 'scan.srcClipboard': 'սեղմատախտակ',
    'scan.notImage': 'Սա նկար չէ', 'scan.unreadable': 'Նկարը կարդալ չհաջողվեց', 'scan.notFound': 'Նկարում QR կոդ չի գտնվել',
    'scan.torchNA': 'Լույսը հասանելի չէ', 'scan.decoderFail': 'Ապակոդավորիչը բեռնել չհաջողվեց՝ {msg}',
    'scan.asQr': 'Ստեղծել որպես QR', 'scan.asQrTitle': 'Այս բովանդակությունից ստեղծել նոր QR կոդ', 'scan.rawCopy': 'Պատճենել հում բովանդակությունը',
    'type.link': 'Հղում', 'type.otp': 'Մեկանգամյա գաղտնաբառ (2FA)', 'type.authExport': 'Authenticator-ի արտահանում', 'type.wifi': 'Wi-Fi հասանելիություն',
    'type.payment': '{name} վճարում', 'type.email': 'Էլ. փոստ', 'type.phone': 'Հեռախոսահամար', 'type.sms': 'SMS', 'type.place': 'Վայր',
    'type.contact': 'Կոնտակտ', 'type.event': 'Իրադարձություն', 'type.app': 'Հավելվածի հղում ({scheme}:)', 'type.bareUrl': 'Հասցե առանց https://',
    'type.number': 'Թիվ / կոդ', 'type.text': 'Տեքստ',
    'f.address': 'Հասցե', 'f.service': 'Ծառայություն', 'f.account': 'Հաշիվ', 'f.type': 'Տեսակ', 'f.content': 'Բովանդակություն',
    'f.migration': 'Google Authenticator-ի փոխանցում (մի քանի հաշիվ)', 'f.ssid': 'Ցանց (SSID)', 'f.enc': 'Գաղտնագրում', 'f.open': 'բաց',
    'f.password': 'Գաղտնաբառ', 'f.hiddenNet': 'Թաքնված ցանց', 'f.yes': 'այո', 'f.amount': 'Գումար', 'f.label': 'Անվանում', 'f.message': 'Հաղորդագրություն',
    'f.to': 'Ում', 'f.subject': 'Թեմա', 'f.text': 'Տեքստ', 'f.number': 'Համար', 'f.coords': 'Կոորդինատներ', 'f.search': 'Որոնում',
    'f.name': 'Անուն', 'f.org': 'Կազմակերպություն', 'f.phone': 'Հեռախոս', 'f.email': 'Էլ. փոստ', 'f.web': 'Կայք',
    'f.title': 'Վերնագիր', 'f.begin': 'Սկիզբ', 'f.end': 'Ավարտ', 'f.location': 'Վայր',
    'a.open': 'Բացել', 'a.copyLink': 'Պատճենել հղումը', 'a.openPassApp': 'Բացել գաղտնաբառերի հավելվածում', 'a.copyKey': 'Պատճենել բանալին',
    'a.copyOtp': 'Պատճենել otpauth URI-ն', 'a.openAuth': 'Բացել Authenticator-ում', 'a.copyUri': 'Պատճենել URI-ն', 'a.copyPass': 'Պատճենել գաղտնաբառը',
    'a.copySsid': 'Պատճենել SSID-ն', 'a.openWallet': 'Բացել դրամապանակում', 'a.copyAddr': 'Պատճենել հասցեն', 'a.writeEmail': 'Գրել նամակ',
    'a.call': 'Զանգել', 'a.copyNumber': 'Պատճենել համարը', 'a.writeSms': 'Գրել հաղորդագրություն', 'a.openMap': 'Բացել քարտեզը',
    'a.copyCoords': 'Պատճենել կոորդինատները', 'a.addContact': 'Ավելացնել կոնտակտներին',
    'a.contactHint': 'Ներբեռնում է .vcf ֆայլ — բացելով՝ կոնտակտն ավելանում է Կոնտակտներ/Outlook-ում։',
    'a.copyPhone': 'Պատճենել հեռախոսը', 'a.copyEmail': 'Պատճենել էլ. փոստը', 'a.addCalendar': 'Ավելացնել օրացույցին',
    'a.calendarHint': 'Ներբեռնում է .ics ֆայլ — բացելով՝ իրադարձությունը ստեղծվում է օրացույցում։', 'a.openApp': 'Բացել հավելվածով',
    'n.phishing': 'Ուշադրություն՝ հասցեն @-ից առաջ պարունակում է օգտանուն — բնորոշ է ֆիշինգին։',
    'n.punycode': 'Ուշադրություն՝ հոսթի անունը հատուկ նիշեր է օգտագործում (Punycode) — ուշադիր նայեք։',
    'n.otp': 'Գաղտնի բանալին մնում է այստեղ՝ դիտարկիչում։ «Բացել գաղտնաբառերի հավելվածում»-ը այն փոխանցում է Apple Passwords / Keychain-ին, 1Password-ին, Bitwarden-ին, Authenticator-ին և այլն։',
    'n.wifiMac': 'Mac-ում՝ Wi-Fi ընտրացանկ → ընտրել ցանցը → տեղադրել գաղտնաբառը։ iPhone/iPad-ը նման կոդերն անմիջապես ճանաչում է Camera հավելվածում։',
    'n.unknownScheme': 'Անհայտ սխեմա — «Բացել հավելվածով»-ը հասցեն փոխանցում է համակարգին. համապատասխան հավելված պետք է տեղադրված լինի։',

    'secret.title': 'Գաղտնիք · Toolbox', 'secret.h1': 'Կիսվել գաղտնիքով',
    'secret.lead': 'Ուղարկեք գաղտնաբառ կամ տեքստ որպես ինքնաոչնչացվող հղում։ Գաղտնագրվում է դիտարկիչում — սերվերը տեսնում է միայն անիմաստ տվյալներ, բանալին հղման մեջ է՝ <span class="mono">#</span>-ից հետո։',
    'secret.label': 'Գաղտնիք', 'secret.ph': 'Գաղտնաբառ, մուտքի տվյալներ, տեքստ …', 'secret.max': 'առավելագույնը ~100 ԿԲ տեքստ',
    'secret.destroy': 'Ոչնչացնել', 'secret.once': 'անմիջապես առաջին ընթերցումից հետո', 'secret.hours': 'ժամկետից հետո՝ առաջին ընթերցումից սկսած',
    'secret.deadline': 'Ժամկետ առաջին բացումից հետո',
    'secret.deadlineHint': 'Այդ ընթացքում հղումը կարելի է բացել մի քանի անգամ — օր.՝ եթե ստացողին այն սկզբում պետք է հեռախոսում, հետո՝ համակարգչում։',
    'secret.passLabel': 'Լրացուցիչ գաղտնաբառ (ըստ ցանկության)', 'secret.passPh': 'հաղորդվում է այլ ճանապարհով, օր.՝ հեռախոսով',
    'secret.passHint': 'Այդ դեպքում միայն հղումն այլևս բավարար չէ կարդալու համար։ Ով որսա հղումը, միևնույն է ոչինչ չի տեսնի։',
    'secret.unopened': 'Չբացված գաղտնիքները ջնջվում են 7 օր հետո։',
    'secret.create': 'Ստեղծել հղում', 'secret.ready': 'Հղումը պատրաստ է', 'secret.asQr': 'Որպես QR կոդ', 'secret.burn': 'Ոչնչացնել հիմա', 'secret.new': 'Նոր գաղտնիք',
    'secret.tooLong': 'Չափազանց երկար է (առավելագույնը ~100 ԿԲ)', 'secret.encrypting': 'Գաղտնագրում …',
    'secret.onceHint': 'Հղումն աշխատում է ուղիղ մեկ անգամ։ Չբացված՝ այն անվավեր է դառնում 7 օր հետո։',
    'secret.hoursHint': 'Առաջին բացումից հետո հղումը կարդալի է մնում {span}, ապա ջնջվում է։ Չբացված՝ այն անվավեր է դառնում 7 օր հետո։',
    'secret.passSeparately': 'Գաղտնաբառը խնդրում ենք հաղորդել առանձին։',
    'secret.linkCopied': 'Հղումը պատճենվեց', 'secret.burned': 'Ոչնչացվեց', 'secret.deleted': '— ջնջված է —',

    'open.h1': 'Գաղտնիք', 'open.lead': 'Ինչ-որ մեկը ձեզ գաղտնի բան է ուղարկել։', 'open.checking': 'Հղումը ստուգվում է …',
    'open.pass': 'Գաղտնաբառ', 'open.passPh': 'ձեզ հաղորդվել է առանձին', 'open.show': 'Ցույց տալ գաղտնիքը',
    'open.tip': 'Խորհուրդ՝ պահեք բովանդակությունը ձեր գաղտնաբառերի կառավարիչում՝ այս էջը բաց թողնելու փոխարեն։',
    'open.gone': 'Այս գաղտնիքը (այլևս) գոյություն չունի. հղումն անվավեր է, ժամկետանց է կամ արդեն կարդացվել է։ Խնդրեք ուղարկողին նոր հղում։',
    'open.share': 'Ինքներդ կիսվել գաղտնիքով',
    'open.onceNote': '<b>Կարդալի է միայն մեկ անգամ։</b> Հենց սեղմեք «Ցույց տալ», գաղտնիքը ջնջվում է սերվերից։ Դրանից հետո այն ոչ ոք չի կարող բացել — նույնիսկ դուք։ Պատրա՞ստ եք։',
    'open.openedNote': 'Այս գաղտնիքն արդեն բացվել է և կարդալի է մինչև <b>{date}</b>։',
    'open.deadlineNote': '<b>Ժամկետը սկսվում է բացելիս։</b> Առաջին ցուցադրումից սկսած գաղտնիքը կարդալի է մնում {span}, ապա ջնջվում է։',
    'open.needPass': 'Խնդրում ենք մուտքագրել գաղտնաբառը։',
    'open.decryptFailOnce': 'Ապագաղտնագրումը ձախողվեց — գաղտնաբառը սխա՞լ է։ Փորձեք նորից՝ առանց այս էջը վերաբեռնելու։',
    'open.decryptFail': 'Ապագաղտնագրումը ձախողվեց — գաղտնաբառը սխա՞լ է։', 'open.err': 'Սխալ՝ {msg}',
    'open.burnedNote': 'Գաղտնիքը ջնջվել է սերվերից։ Այն այժմ գոյություն ունի միայն այստեղ՝ ձեր էկրանին։',
    'open.readableUntil': 'Կարդալի է մինչև <b>{date}</b> (<span class="countdown" id="cd"></span>)։ Ապա ջնջվում է։',
    'open.remaining': 'մնաց {time}', 'open.burnedShort': 'Ջնջվել է սերվերից։ Գոյություն ունի միայն այստեղ՝ ձեր էկրանին։',

    'short.title': 'Կարճ հղում · Toolbox', 'short.h1': 'Կարճ հղում',
    'short.lead': 'Երկար հասցե → <span class="mono">tools.martuni.de/abc123</span>։ Ստեղծելու համար անհրաժեշտ է բանալի, բացել կարող է յուրաքանչյուրը։',
    'short.target': 'Նպատակային հասցե', 'short.code': 'Ցանկալի կոդ (ըստ ցանկության)', 'short.codePh': 'այլապես պատահական, 6 նիշ',
    'short.key': 'Բանալի', 'short.keyPh': 'հիշվում է այս դիտարկիչում', 'short.create': 'Ստեղծել կարճ հղում',
    'short.lookup': 'Փնտրել', 'short.codeLabel': 'Կոդ', 'short.check': 'Ստուգել',
    'short.noKey': 'Առանց բանալու հնարավոր չէ։', 'short.copied': 'Կարճ հղումը պատճենվեց', 'short.notFound': 'Այս կոդով կարճ հղում չկա։',
    'short.hits_one': '{n} այց', 'short.hits_other': '{n} այց', 'short.created': 'ստեղծվել է {date}', 'short.last': 'վերջինը՝ {date}',
  };

  const ru = {
    'brand': 'Toolbox',
    'nav.qr': 'Создать QR', 'nav.scan': 'Сканировать QR', 'nav.secret': 'Секрет', 'nav.short': 'Короткая ссылка',
    'theme': 'Светлая / тёмная тема', 'language': 'Язык', 'notes': 'Заметки',
    'copied': 'Скопировано', 'copy': 'Копировать', 'copyFail': 'Копирование невозможно',
    'unknownErr': 'Неизвестная ошибка', 'errStatus': 'Ошибка {n}',
    'hours_one': '{n} час', 'hours_few': '{n} часа', 'hours_many': '{n} часов', 'hours_other': '{n} часа',
    'days_one': '{n} день', 'days_few': '{n} дня', 'days_many': '{n} дней', 'days_other': '{n} дня',
    'api.too_large': 'Слишком большой объём (макс. 256 КБ)', 'api.bad_json': 'Некорректный JSON',
    'api.rate_limited': 'Слишком много запросов — попробуйте позже', 'api.bad_payload': 'Некорректный запрос',
    'api.bad_hours': 'Срок от 0,25 до {max} часов', 'api.gone': 'Неизвестно, истекло или уже прочитано',
    'api.bad_key': 'Ключ отсутствует или неверен', 'api.bad_url': 'Укажите http(s)-адрес',
    'api.bad_code': 'Желаемый код: 3–32 символа, a–z A–Z 0–9 _ -', 'api.code_taken': 'Код уже занят',
    'api.unknown_code': 'Неизвестный код',

    'index.title': 'Toolbox · tools.martuni.de',
    'index.lead': 'Небольшие инструменты, работающие в браузере. Ни одному не нужна учётная запись.',
    'index.qr': 'Из URL, текста или Bitcoin-адреса. Как изображение в буфер обмена или скачать в PNG/SVG. Работает полностью локально.',
    'index.scan': 'Камерой, со скриншота или вставкой. Открывать ссылки, копировать пароль Wi-Fi, передавать TOTP в менеджер паролей, сохранять контакты.',
    'index.secret': 'Отправить пароль или текст одноразовой ссылкой. Исчезает после первого прочтения или по истечении срока. Сквозное шифрование.',
    'index.short': 'Длинный адрес → <span class="mono">tools.martuni.de/abc123</span>. Создание только с ключом, чтобы сервис не использовали для спама.',

    'qr.title': 'Создать QR · Toolbox',
    'qr.lead': 'Создаётся полностью в браузере — введённое не покидает это устройство.',
    'qr.kind': 'Тип', 'qr.kindText': 'Текст / URL', 'qr.kindWifi': 'Wi-Fi',
    'qr.content': 'Содержимое', 'qr.contentPh': 'https://… или любой текст',
    'qr.addr': 'Адрес', 'qr.amount': 'Сумма (BTC, необязательно)', 'qr.label': 'Название (необязательно)', 'qr.labelPh': 'напр. пожертвование',
    'qr.bip21': 'Получается <span class="mono">bitcoin:</span>-URI (BIP-21), который кошельки открывают напрямую.',
    'qr.ssid': 'Имя сети (SSID)', 'qr.enc': 'Шифрование', 'qr.open': 'открытая', 'qr.pass': 'Пароль', 'qr.hidden': 'скрытая сеть',
    'qr.display': 'Оформление', 'qr.ecl': 'Коррекция ошибок',
    'qr.eclL': '~7 % — самый маленький код', 'qr.eclM': '~15 %', 'qr.eclQ': '~25 %', 'qr.eclH': '~30 % — надёжно, напр. для печати',
    'qr.size': 'Размер изображения (экспорт)', 'qr.margin': 'Поле (модули)', 'qr.preview': 'Предпросмотр QR-кода',
    'qr.empty': 'Введите что-нибудь …', 'qr.copyImg': 'Копировать изображение', 'qr.copyText': 'Копировать закодированный текст',
    'qr.tooLong': 'Слишком длинно для QR-кода ({n} символов)',
    'qr.meta': 'Версия {v} · {n}×{n} модулей · {len} символов · коррекция {ecl}',
    'qr.imgCopied': 'Изображение скопировано в буфер обмена', 'qr.imgCopyFail': 'Не удалось скопировать изображение — используйте PNG', 'qr.textCopied': 'Текст скопирован',

    'scan.title': 'Сканировать QR · Toolbox',
    'scan.lead': 'Наведите камеру на код — или вставьте скриншот (Ctrl/⌘ V), перетащите сюда или выберите файл. Всё обрабатывается локально в браузере.',
    'scan.starting': 'Камера запускается …', 'scan.start': 'Включить камеру', 'scan.stop': 'Выключить камеру', 'scan.again': 'Сканировать дальше',
    'scan.pickCam': 'Выбрать камеру', 'scan.torch': 'Фонарик', 'scan.pickImg': 'Выбрать изображение …', 'scan.raw': 'Исходное содержимое',
    'scan.nothing': 'Пока ничего не отсканировано.',
    'scan.macTip': 'Совет для MacBook: скриншот через <span class="mono">⌘ ⇧ 4</span> в буфер обмена (удерживая Ctrl), затем здесь <span class="mono">⌘ V</span>.',
    'scan.recent': 'Недавно отсканировано',
    'scan.engineNative': 'Распознавание: встроенный декодер браузера.', 'scan.engineJsqr': 'Распознавание: jsQR (локально в браузере).',
    'scan.noCamApi': 'Этот браузер не даёт доступа к камере. Вставка или выбор изображения всё равно работают.',
    'scan.noHttps': 'Доступ к камере возможен только по HTTPS. Вставка или выбор изображения всё равно работают.',
    'scan.denied': 'Доступ к камере отклонён. Разрешите его для этого сайта в настройках браузера и запустите снова.',
    'scan.noCam': 'Камера не найдена. Вставка или выбор изображения всё равно работают.',
    'scan.busy': 'Камера сейчас используется другим приложением.',
    'scan.failed': 'Не удалось запустить камеру ({name}).', 'scan.camN': 'Камера {n}',
    'scan.hit': 'Код распознан', 'scan.srcCamera': 'камера', 'scan.srcFile': 'файл', 'scan.srcClipboard': 'буфер обмена',
    'scan.notImage': 'Это не изображение', 'scan.unreadable': 'Не удалось прочитать изображение', 'scan.notFound': 'QR-код на изображении не найден',
    'scan.torchNA': 'Фонарик недоступен', 'scan.decoderFail': 'Не удалось загрузить декодер: {msg}',
    'scan.asQr': 'Создать как QR', 'scan.asQrTitle': 'Создать новый QR-код из этого содержимого', 'scan.rawCopy': 'Копировать исходное содержимое',
    'type.link': 'Ссылка', 'type.otp': 'Одноразовый пароль (2FA)', 'type.authExport': 'Экспорт Authenticator', 'type.wifi': 'Доступ к Wi-Fi',
    'type.payment': 'Платёж {name}', 'type.email': 'E-mail', 'type.phone': 'Номер телефона', 'type.sms': 'SMS', 'type.place': 'Место',
    'type.contact': 'Контакт', 'type.event': 'Событие', 'type.app': 'Ссылка приложения ({scheme}:)', 'type.bareUrl': 'Адрес без https://',
    'type.number': 'Число / код', 'type.text': 'Текст',
    'f.address': 'Адрес', 'f.service': 'Сервис', 'f.account': 'Аккаунт', 'f.type': 'Тип', 'f.content': 'Содержимое',
    'f.migration': 'Перенос Google Authenticator (несколько аккаунтов)', 'f.ssid': 'Сеть (SSID)', 'f.enc': 'Шифрование', 'f.open': 'открытая',
    'f.password': 'Пароль', 'f.hiddenNet': 'Скрытая сеть', 'f.yes': 'да', 'f.amount': 'Сумма', 'f.label': 'Название', 'f.message': 'Сообщение',
    'f.to': 'Кому', 'f.subject': 'Тема', 'f.text': 'Текст', 'f.number': 'Номер', 'f.coords': 'Координаты', 'f.search': 'Поиск',
    'f.name': 'Имя', 'f.org': 'Организация', 'f.phone': 'Телефон', 'f.email': 'E-mail', 'f.web': 'Сайт',
    'f.title': 'Название', 'f.begin': 'Начало', 'f.end': 'Конец', 'f.location': 'Место',
    'a.open': 'Открыть', 'a.copyLink': 'Копировать ссылку', 'a.openPassApp': 'Открыть в менеджере паролей', 'a.copyKey': 'Копировать ключ',
    'a.copyOtp': 'Копировать otpauth-URI', 'a.openAuth': 'Открыть в Authenticator', 'a.copyUri': 'Копировать URI', 'a.copyPass': 'Копировать пароль',
    'a.copySsid': 'Копировать SSID', 'a.openWallet': 'Открыть в кошельке', 'a.copyAddr': 'Копировать адрес', 'a.writeEmail': 'Написать письмо',
    'a.call': 'Позвонить', 'a.copyNumber': 'Копировать номер', 'a.writeSms': 'Написать сообщение', 'a.openMap': 'Открыть карту',
    'a.copyCoords': 'Копировать координаты', 'a.addContact': 'Добавить в контакты',
    'a.contactHint': 'Скачивает файл .vcf — при открытии контакт добавляется в Контакты/Outlook.',
    'a.copyPhone': 'Копировать телефон', 'a.copyEmail': 'Копировать e-mail', 'a.addCalendar': 'Добавить в календарь',
    'a.calendarHint': 'Скачивает файл .ics — при открытии событие создаётся в календаре.', 'a.openApp': 'Открыть приложением',
    'n.phishing': 'Внимание: адрес содержит имя пользователя перед @ — типично для фишинга.',
    'n.punycode': 'Внимание: имя хоста использует специальные символы (Punycode) — присмотритесь.',
    'n.otp': 'Секретный ключ остаётся здесь, в браузере. «Открыть в менеджере паролей» передаёт его в Apple Passwords / Связку ключей, 1Password, Bitwarden, Authenticator и т. п.',
    'n.wifiMac': 'На Mac: меню Wi-Fi → выбрать сеть → вставить пароль. iPhone/iPad распознают такие коды прямо в приложении Камера.',
    'n.unknownScheme': 'Неизвестная схема — «Открыть приложением» передаёт адрес системе; подходящее приложение должно быть установлено.',

    'secret.title': 'Секрет · Toolbox', 'secret.h1': 'Поделиться секретом',
    'secret.lead': 'Отправить пароль или текст самоуничтожающейся ссылкой. Шифруется в браузере — сервер видит только мусор, ключ находится в ссылке после <span class="mono">#</span>.',
    'secret.label': 'Секрет', 'secret.ph': 'Пароль, учётные данные, текст …', 'secret.max': 'макс. ~100 КБ текста',
    'secret.destroy': 'Уничтожить', 'secret.once': 'сразу после первого прочтения', 'secret.hours': 'по истечении срока с первого прочтения',
    'secret.deadline': 'Срок после первого открытия',
    'secret.deadlineHint': 'В это время ссылку можно открывать несколько раз — напр., если получателю она нужна сначала на телефоне, потом на компьютере.',
    'secret.passLabel': 'Дополнительная парольная фраза (необязательно)', 'secret.passPh': 'сообщается другим путём, напр. по телефону',
    'secret.passHint': 'Тогда одной ссылки для чтения уже недостаточно. Кто перехватит ссылку, всё равно ничего не увидит.',
    'secret.unopened': 'Неоткрытые секреты удаляются через 7 дней.',
    'secret.create': 'Создать ссылку', 'secret.ready': 'Ссылка готова', 'secret.asQr': 'Как QR-код', 'secret.burn': 'Уничтожить сейчас', 'secret.new': 'Новый секрет',
    'secret.tooLong': 'Слишком длинно (макс. ~100 КБ)', 'secret.encrypting': 'Шифрование …',
    'secret.onceHint': 'Ссылка работает ровно один раз. Неоткрытая, она истекает через 7 дней.',
    'secret.hoursHint': 'После первого открытия ссылка остаётся доступной {span}, затем удаляется. Неоткрытая, она истекает через 7 дней.',
    'secret.passSeparately': 'Парольную фразу сообщите отдельно.',
    'secret.linkCopied': 'Ссылка скопирована', 'secret.burned': 'Уничтожено', 'secret.deleted': '— удалено —',

    'open.h1': 'Секрет', 'open.lead': 'Кто-то отправил вам нечто конфиденциальное.', 'open.checking': 'Проверяю ссылку …',
    'open.pass': 'Парольная фраза', 'open.passPh': 'была сообщена вам отдельно', 'open.show': 'Показать секрет',
    'open.tip': 'Совет: сохраните содержимое в менеджере паролей вместо того, чтобы оставлять эту страницу открытой.',
    'open.gone': 'Этого секрета (больше) нет: ссылка недействительна, истекла или уже была прочитана. Попросите отправителя о новой ссылке.',
    'open.share': 'Поделиться секретом самому',
    'open.onceNote': '<b>Можно прочитать только один раз.</b> Как только вы нажмёте «Показать», секрет будет удалён с сервера. После этого его никто не откроет — даже вы. Готовы?',
    'open.openedNote': 'Этот секрет уже был открыт и остаётся доступным до <b>{date}</b>.',
    'open.deadlineNote': '<b>Срок начинается при открытии.</b> С первого показа секрет остаётся доступным {span}, затем удаляется.',
    'open.needPass': 'Введите парольную фразу.',
    'open.decryptFailOnce': 'Расшифровка не удалась — неверная парольная фраза? Попробуйте ещё раз, не перезагружая эту страницу.',
    'open.decryptFail': 'Расшифровка не удалась — неверная парольная фраза?', 'open.err': 'Ошибка: {msg}',
    'open.burnedNote': 'Секрет удалён с сервера. Теперь он существует только здесь, на вашем экране.',
    'open.readableUntil': 'Доступен до <b>{date}</b> (<span class="countdown" id="cd"></span>). Затем будет удалён.',
    'open.remaining': 'осталось {time}', 'open.burnedShort': 'Удалено с сервера. Существует только здесь, на вашем экране.',

    'short.title': 'Короткая ссылка · Toolbox', 'short.h1': 'Короткая ссылка',
    'short.lead': 'Длинный адрес → <span class="mono">tools.martuni.de/abc123</span>. Для создания нужен ключ; открыть может любой.',
    'short.target': 'Целевой адрес', 'short.code': 'Желаемый код (необязательно)', 'short.codePh': 'иначе случайный, 6 символов',
    'short.key': 'Ключ', 'short.keyPh': 'запоминается в этом браузере', 'short.create': 'Создать короткую ссылку',
    'short.lookup': 'Проверить', 'short.codeLabel': 'Код', 'short.check': 'Проверить',
    'short.noKey': 'Без ключа не получится.', 'short.copied': 'Короткая ссылка скопирована', 'short.notFound': 'Короткой ссылки с таким кодом нет.',
    'short.hits_one': '{n} переход', 'short.hits_few': '{n} перехода', 'short.hits_many': '{n} переходов', 'short.hits_other': '{n} перехода',
    'short.created': 'создана {date}', 'short.last': 'последний {date}',
  };

  const MSGS = { de, en, hy, ru };

  function detect() {
    const saved = localStorage.getItem(LS_LANG);
    if (LANGS.includes(saved)) return saved;
    for (const tag of navigator.languages || [navigator.language]) {
      const base = String(tag || '').toLowerCase().split(/[-_]/)[0];
      if (LANGS.includes(base)) return base;
    }
    return 'de';
  }

  let lang = detect();
  let plural = new Intl.PluralRules(lang);

  function fill(text, params) {
    return params ? text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : text;
  }
  function t(key, params) {
    const s = MSGS[lang][key] ?? MSGS.de[key];
    if (s == null) { console.warn('i18n: fehlender Schlüssel', key); return key; }
    return fill(s, params);
  }
  function tn(key, n) {
    const m = MSGS[lang];
    return fill(m[key + '_' + plural.select(n)] ?? m[key + '_other'] ?? MSGS.de[key + '_other'], { n });
  }
  /* Fehlermeldung einer API-Antwort: übersetzter Code, sonst Servertext, sonst Status */
  function apiError(j, status) {
    if (j && j.code && MSGS.de['api.' + j.code]) return t('api.' + j.code, j.params || {});
    return (j && j.error) || t('errStatus', { n: status });
  }

  function apply(root = document) {
    document.documentElement.lang = lang;
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
    for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
    for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
    for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
    for (const el of root.querySelectorAll('[data-i18n-plural]')) el.textContent = tn(el.dataset.i18nPlural, Number(el.dataset.n));
    for (const el of root.querySelectorAll('.lang-select')) el.value = lang;
  }

  function set(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next;
    plural = new Intl.PluralRules(lang);
    localStorage.setItem(LS_LANG, lang);
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  return {
    LANGS, NAMES, t, tn, apiError, apply, set,
    get lang() { return lang; },
    get locale() { return LOCALES[lang]; },
  };
})();

const t = I18N.t;
const tn = I18N.tn;
