// Erklärungen der Spielmodi (Anzeige im Regel-Dialog).

export const RULES = {
  x01: {
    goal: 'Bringe deinen Punktestand von 301, 501 oder 701 als Erster genau auf 0.',
    steps: [
      'Pro Aufnahme wirfst du 3 Darts. Die Summe wird von deinem Rest abgezogen.',
      '<b>Double Out:</b> Der letzte Dart muss ein Doppel treffen (äußerer Ring) – Bull zählt als Doppel 25. <b>Single Out:</b> beliebiges Feld. <b>Master Out:</b> Doppel oder Triple.',
      '<b>Bust:</b> Wirfst du unter 0, bleibt bei Double Out ein Rest von 1 oder triffst du die 0 ohne Doppel, zählt die ganze Aufnahme nicht.',
      '<b>Double In</b> (optional): Punkte zählen erst ab dem ersten Doppeltreffer.',
      '<b>First to 3 Legs:</b> Wer zuerst 3 Durchgänge (Legs) gewinnt, gewinnt das Match. Bei <b>Sets</b> bilden mehrere Legs ein Set.',
    ],
    modes: [
      ['Solo', 'Allein spielen – ideal, um dein Scoring und Finishen zu üben.'],
      ['Gegner', 'Bis zu 8 Spieler werfen abwechselnd, jeder mit eigenem Punktestand.'],
      ['Dartbot', 'Ein Computergegner in 10 Stufen von ca. Ø 25 (Einsteiger) bis Ø 100 (Profi).'],
      ['Doppel', 'Zwei Teams teilen sich je einen Punktestand. Es wird abwechselnd geworfen: A1 → B1 → A2 → B2.'],
    ],
    input: 'Gib die Punkte einer Aufnahme über den Ziffernblock ein oder schalte oben rechts auf Dart-für-Dart-Eingabe um. Goldene Felder zeigen den empfohlenen Checkout-Weg.',
    tip: 'Ab einem Rest von 170 oder weniger zeigt die App, wie du checken kannst. Der Klassiker: T20 · T20 · Bull für 170.',
  },
  atc: {
    goal: 'Triff alle Zahlen von 1 bis 20 der Reihe nach – mit so wenig Darts wie möglich.',
    steps: [
      'Du beginnst bei der 1. Sobald du sie triffst, ist die 2 dran, dann die 3 und so weiter.',
      'Nach jedem Dart tippst du <b>Treffer</b> oder <b>Daneben</b>. Nach 3 Darts ist der nächste Spieler dran.',
      'Mit der Option <b>Bull</b> musst du zum Schluss noch das Bullseye treffen.',
      '<b>Nur Doubles / Nur Triples:</b> Es zählt nur der äußere bzw. innere schmale Ring – deutlich schwerer.',
      '<b>Sprünge:</b> Ein Double bringt dich 2 Zahlen weiter, ein Triple 3.',
    ],
    score: 'Wer weniger Darts braucht, gewinnt. Zusätzlich wird deine Trefferquote gespeichert.',
    tip: 'Perfektes Aufwärmtraining – du triffst dabei jede Zahl des Boards.',
  },
  bobs27: {
    goal: 'Doppel-Training nach Bob Anderson: Sammle möglichst viele Punkte, ohne unter 0 zu fallen.',
    steps: [
      'Du startest mit <b>27 Punkten</b>.',
      'Runde 1 wirfst du 3 Darts auf D1, Runde 2 auf D2 … bis D20 und zum Schluss Bull (21 Runden).',
      'Jeder Treffer bringt den Wert des Doppels: Bei D5 sind das 10 Punkte pro Treffer.',
      'Triffst du in einer Runde gar nicht, wird der Wert einmal abgezogen (D5: −10).',
      'Fällst du unter 0, bist du ausgeschieden (abschaltbar).',
    ],
    input: 'Tippe nach jeder Runde, wie viele der 3 Darts im Doppel waren (0–3).',
    score: 'Höchster Punktestand gewinnt. Maximal möglich sind 1.437 Punkte.',
    tip: 'Ein Ergebnis über 0 ist für Einsteiger schon ein Erfolg – Profis kommen auf mehrere hundert Punkte.',
  },
  power: {
    goal: 'Erziele in einer festen Anzahl Aufnahmen so viele Punkte wie möglich.',
    steps: [
      'Wähle 5, 10, 20 oder 33 Aufnahmen à 3 Darts.',
      'Gib nach jeder Aufnahme die erzielten Punkte ein.',
      'Es gibt kein Finish und keinen Bust – nur Scoring zählt.',
    ],
    score: 'Gewertet wird der Durchschnitt pro Aufnahme – direkt vergleichbar mit deinem 3-Dart-Average.',
    tip: 'Bleib konsequent auf der T20. Wenn die Darts die 20 blockieren, weiche auf T19 aus.',
  },
  doubles: {
    goal: 'Verbessere deine Trefferquote auf die Doppel – sie entscheiden jedes X01-Leg.',
    steps: [
      'Pro Aufnahme wirfst du 3 Darts auf das angezeigte Doppel.',
      'Danach tippst du, wie viele getroffen haben (0–3).',
      '<b>D1 → Bull:</b> alle Doppel der Reihe nach. <b>Zufällig:</b> gemischte Doppel. <b>Ein Doppel:</b> nur dein Lieblingsdoppel, z. B. D16 oder D20.',
    ],
    score: 'Gewertet wird die Trefferquote in Prozent. Profis liegen bei etwa 40 %.',
    tip: 'Übe besonders D16, D20 und D8 – auf diesen Doppeln enden die meisten Checkouts.',
  },
  c121: {
    goal: 'Checke dich von 121 aus so weit nach oben wie möglich – bevor dir die Leben ausgehen.',
    steps: [
      'Du startest mit einem Rest von <b>121</b> und spielst wie im X01 mit Double Out.',
      'Für jedes Ziel hast du eine feste Anzahl Darts, z. B. <b>9 Darts</b> (= 3 Aufnahmen).',
      'Checkst du rechtzeitig, ist das nächste Ziel eine Zahl höher: 122, 123 …',
      '<b>Checkpoint:</b> Checkst du besonders schnell (z. B. in ≤ 6 Darts), wird diese Zahl dein Checkpoint.',
      'Schaffst du ein Ziel nicht, verlierst du ein <b>Leben</b> und musst zurück zum letzten Checkpoint (am Anfang 121) – oder das Ziel bleibt, je nach Einstellung.',
      'Sind alle Leben weg, ist das Spiel vorbei.',
    ],
    input: 'Gib pro Aufnahme die erzielten Punkte ein – der Rest wird automatisch berechnet. Über „Check“ trägst du den Checkout direkt ein.',
    score: 'Gewertet wird das höchste geschaffte Ziel, außerdem die Anzahl der Checks.',
    tip: 'Typischer Weg für 121: T20 · 11 · Bull oder T17 · T10 · D20. Die App zeigt dir einen Vorschlag.',

  },
};

export function rulesHtml(type) {
  const r = RULES[type];
  if (!r) return '';
  const sec = (title, body) => `<div class="rule-sec"><div class="rule-h">${title}</div>${body}</div>`;
  return `<div class="rules">
    <p class="rule-goal">${r.goal}</p>
    ${sec('So läuft es ab', `<ol>${r.steps.map(s => `<li>${s}</li>`).join('')}</ol>`)}
    ${r.modes ? sec('Spielvarianten', `<dl>${r.modes.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`) : ''}
    ${r.input ? sec('Eingabe', `<p>${r.input}</p>`) : ''}
    ${r.score ? sec('Wertung', `<p>${r.score}</p>`) : ''}
    ${r.tip ? `<p class="rule-tip">💡 ${r.tip}</p>` : ''}
  </div>`;
}
