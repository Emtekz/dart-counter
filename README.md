# 🎯 Dart Counter

Ein Punktezähler für Darts (X01) – reines HTML, CSS und JavaScript, ohne Abhängigkeiten.
Läuft auf Desktop, Tablet und Smartphone.

## Funktionen

- **X01**: 301, 501 oder 701
- **Check-out**: Single, Double oder Master Out (inkl. Bust-Erkennung)
- **1–8 Spieler**, Reihenfolge anpassbar – als gespeichertes Profil oder als Gast
- **Dartbot** in 10 Stufen (Ø 25 bis Ø 105): simuliert echte Würfe mit Streuung auf der Dartscheibe,
  spielt Checkout-Wege und stellt sich Doppel zurecht
- **Spielerprofile mit Langzeit-Statistik**: Spiele, Siege, Legs, 3-Dart-Ø, First-9-Ø, Doppelquote,
  180/140+/100+, höchstes Finish, bestes Leg, Ø-Verlauf und Liste der letzten Spiele
- **Export/Import** der Statistiken als JSON (Sicherung oder Übertragung auf ein anderes Gerät)
- **Legs**: First to 1, 2, 3, 5 oder 7 – Anwurf wechselt jedes Leg
- **Zwei Eingabearten** (jederzeit umschaltbar):
  - *Einzelne Darts*: Single/Double/Triple + Zahl, Bull, Miss
  - *Aufnahme (Summe)*: Gesamtpunktzahl eintippen, Schnelltasten für häufige Werte
- **Checkout-Vorschläge** ab 170 Rest
- **Rückgängig** für jeden Wurf
- **Spielstatistik**: 3-Dart-Durchschnitt, First 9, 180er, 140+, 100+, Doppelquote, höchstes Finish, bestes Leg
- Spielstand wird automatisch im Browser gespeichert (Neuladen ohne Verlust)
- Bildschirm bleibt während des Spiels an (sofern vom Browser unterstützt)
- Als App auf dem Homescreen installierbar

## Hinweise zur Statistik

- In die Profil-Statistik fließen nur **beendete** Spiele ein.
- Die **Doppelquote** wird nur bei der Eingabe einzelner Darts erfasst – bei der Summen-Eingabe ist nicht
  bekannt, wie viele Darts auf ein Doppel gingen.
- Die Daten liegen im `localStorage` des Browsers. Wer Browserdaten löscht, verliert sie – daher
  gelegentlich exportieren.

## Tastatur (Desktop)

| Taste | Funktion |
|---|---|
| `S` / `D` / `T` | Single / Double / Triple |
| `M` oder `0` | Miss (Dart-Eingabe) |
| Ziffern + `Enter` | Summe eingeben (Summen-Eingabe) |
| `Strg+Z` | Rückgängig |
| `Esc` | Menü |

## Nutzung

`index.html` im Browser öffnen – oder über GitHub Pages veröffentlichen:
Repository → **Settings → Pages** → Branch `main`, Ordner `/ (root)` → **Save**.
