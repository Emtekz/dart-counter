# 🎯 Dart Counter

Ein Dart-Zähler mit Statistik – reines HTML, CSS und JavaScript, ohne Abhängigkeiten.
Läuft auf Desktop, Tablet und Smartphone.

**Live:** https://emtekz.github.io/dart-counter/

## Dashboard

Die Startseite bietet direkten Zugriff auf:

- **Spielen** – neues Spiel einrichten (X01 oder Around the Clock)
- **Spieler** – Spieler anlegen, umbenennen, löschen, Daten sichern
- **Statistiken** – Bestenlisten und Verläufe je Spielmodus
- **Spiel fortsetzen** – ein unterbrochenes Spiel wieder aufnehmen
- **Letzte Spiele** – Ergebnisse der zuletzt beendeten Spiele

## Spielmodi

### X01
- 301, 501 oder 701 mit Single, Double oder Master Out (inkl. Bust-Erkennung)
- Eingabe einzelner Darts (Single/Double/Triple + Zahl) oder der Summe einer Aufnahme
- Checkout-Vorschläge ab 170 Rest

### Around the Clock
- Die Felder 1–20 der Reihe nach treffen, optional das Bull zum Abschluss
- Varianten: **Alle Felder**, **Nur Doppel** oder **Nur Triple**
- Optional: Doppel springt 2, Triple 3 Felder weiter (das Bull kann nicht übersprungen werden)

### Für beide Modi
- 1–8 Spieler (gespeichertes Profil, Gast oder Dartbot), Legs „First to 1–7“, Anwurf wechselt
- **Dartbot** in 10 Stufen (Ø 25 bis Ø 105): simuliert echte Würfe mit Streuung auf der Dartscheibe
- **Rückgängig** für jeden Wurf, Spielstand bleibt beim Neuladen erhalten
- Bildschirm bleibt während des Spiels an, als App auf dem Homescreen installierbar

## Statistiken

Gespeicherte Spieler sammeln bei jedem **beendeten** Spiel Statistiken:

| X01 | Around the Clock |
|---|---|
| Spiele, Siege, Legs | Spiele, Siege, Legs |
| 3-Dart-Ø, First-9-Ø, Ø-Verlauf | Trefferquote, Verlauf |
| Doppelquote¹ | Bestes Leg (Darts) |
| 180 / 140+ / 100+ | |
| Höchstes Finish, bestes Leg | |

¹ Nur bei Eingabe einzelner Darts – bei der Summen-Eingabe ist nicht bekannt, wie viele Darts aufs Doppel gingen.

Die Daten liegen im `localStorage` des Browsers. Über **Spieler → Datensicherung** lassen sie sich
als JSON exportieren und auf einem anderen Gerät importieren.

## Tastatur (Desktop)

| Taste | X01 | Around the Clock |
|---|---|---|
| `S` / `D` / `T` | Single / Double / Triple | – |
| `1` / `2` / `3` | – | Treffer Single / Double / Triple |
| `Enter` / Leertaste | Summe bestätigen | Treffer |
| `M` / `0` | Miss | Daneben |
| `Strg+Z` | Rückgängig | Rückgängig |
| `Esc` | Menü | Menü |
