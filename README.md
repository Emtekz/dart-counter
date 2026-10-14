# 🎯 Dart Counter

Moderner Dart-Punktezähler als Web-App – läuft im Browser auf Handy, Tablet und PC, ohne Installation und ohne Server.

**Live:** https://emtekz.github.io/dart-counter/

## Funktionen

### Spielmodi
- **X01** – 101, 301, 501, 701, 901
  - Straight In / Double In, Double Out / Single Out / Master Out
  - Legs oder Sets (First to …)
  - Checkout-Vorschläge nach Profi-Tabelle als TV-Banner (ein Feld pro Dart)
  - Ausbullen, wer das Match beginnt
  - Lieblingsdoppel pro Spieler (automatisch aus den meisten Treffern oder fest eingestellt) fließt in die Checkout-Wege ein
  - Eingabe als Gesamtpunktzahl (Ziffernblock + Schnelltasten) oder Dart für Dart
- **Allein, gegeneinander (bis 8 Spieler), im Doppel (Teams, z. B. 2 vs 2) oder gegen den Dartbot**
- **Dartbot** in 10 Stufen (ca. Ø 25 bis Ø 100), simuliert echte Streuung auf dem Board

### Trainingsspiele
- **Around the Clock** – 1 bis 20 (+ Bull), beliebig / nur Doubles / nur Triples, optional mit Sprüngen
- **Bob's 27** – D1 bis Bull, Start mit 27 Punkten
- **Power Scoring** – möglichst viele Punkte in 5/10/20/33 Aufnahmen
- **Doppeltraining** – D1 → Bull, zufällige Doppel oder ein Lieblingsdoppel
- **Checkout 121** – ab 121 aufwärts checken, mit Darts pro Ziel (3–15), Checkpoints für schnelle Checks und 1–5 Leben

### Bedienung
- Bis zu 3 Favoriten (Modus, Einstellungen und Spieler) direkt auf der Startseite – Start mit einem Tipp
- Startseite als Spiel-Hub: X01 mit Schnellwahl (301/501/701 · Solo, Gegner, Dartbot, Doppel) und alle Trainingsspiele auf einen Blick
- Zu jedem Spielmodus eine Erklärung der Regeln (ⓘ auf der Startseite, beim Einrichten und im Spiel)
- Spieler einfach in Wurfreihenfolge antippen, Gäste und Bots per Dialog hinzufügen
- Einstellungen sind direkt sichtbar und bleiben gespeichert, bis man sie ändert

### Spieler & Statistiken
- Spielerprofile mit Farbe und Symbol (18 Icons oder Anfangsbuchstabe)
- X01: 3-Dart-Average, First-9-Average, Checkout-Quote, höchstes Finish, bestes Leg, 180er/140+/100+, Siege, Average-Verlauf
- Trainings-Bestwerte und Schnitte je Variante, Bestenlisten
- Verlaufsdiagramme (Average, Checkout-Quote, hohe Aufnahmen, Trainings) mit Zeitraumfilter
- Synchronisation zwischen Geräten per Google-Anmeldung (Firebase)
- Spielhistorie mit Detailansicht und Revanche
- Rückgängig-Funktion, Spiel pausieren und später fortsetzen
- „Broadcast“-Design im Stil von TV-Dartgrafiken (Schrift Barlow Condensed, lokal eingebunden) in Bordeaux/Purpur
- Daten-Export/Import (JSON) – alle Daten bleiben lokal im Browser (localStorage)

## Tastatur (am PC)
- Ziffern + `Enter` für die Punkteingabe, `Backspace` zum Löschen
- `Strg+Z` rückgängig
- Im Training: `0`–`3` für die Anzahl Treffer

## Lokal starten
Die App besteht nur aus statischen Dateien (HTML, CSS, JavaScript-Module). Wegen der ES-Module muss sie über einen Webserver geöffnet werden, z. B.:

```bash
npx serve .
```

## Hosting über GitHub Pages
Repository → **Settings → Pages** → *Deploy from a branch* → Branch `main`, Ordner `/ (root)`.
