// Englischer „Caller“ im Stil eines Turnier-Ansagers – über die Sprachausgabe des Browsers.
import { db } from './store.js';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth'];

/** Britische Schreibweise: 140 → "one hundred and forty" */
export function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  const h = Math.floor(n / 100), r = n % 100;
  return `${ONES[h]} hundred${r ? ' and ' + words(r) : ''}`;
}

const supported = () => 'speechSynthesis' in window;

function voiceScore(v) {
  let s = 0;
  if (/^en[-_]GB/i.test(v.lang)) s += 30;
  else if (/^en[-_](IE|AU|NZ)/i.test(v.lang)) s += 18;
  else if (/^en/i.test(v.lang)) s += 6;
  if (/natural|neural|premium|enhanced|online/i.test(v.name)) s += 45; // deutlich weniger roboterhaft
  if (/google/i.test(v.name)) s += 20;
  if (/ryan|thomas|george|oliver|arthur|daniel|guy|male/i.test(v.name)) s += 10;
  if (/female|libby|sonia|hazel|susan|kate|serena|maisie/i.test(v.name)) s -= 4;
  return s;
}

export function englishVoices() {
  if (!supported()) return [];
  return speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
}

function currentVoice() {
  const all = englishVoices();
  return all.find(v => v.voiceURI === db.settings.callerVoice) || all[0] || null;
}

let voicesCb = () => {};
export function onVoices(cb) {
  voicesCb = cb;
}
if (supported()) speechSynthesis.addEventListener?.('voiceschanged', () => voicesCb());

/** Spricht einen oder mehrere Sätze. interrupt = laufende Ansage abbrechen. */
function speak(lines, { interrupt = true, force = false } = {}) {
  if ((!db.settings.speech && !force) || !supported()) return;
  if (interrupt) speechSynthesis.cancel();
  const voice = currentVoice();
  for (const l of [].concat(lines)) {
    const line = typeof l === 'string' ? { text: l } : l;
    const u = new SpeechSynthesisUtterance(line.text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-GB';
    u.rate = line.rate ?? 0.95;
    u.pitch = line.pitch ?? 0.92;
    speechSynthesis.speak(u);
  }
}

export const caller = {
  gameOn(name) {
    speak([`${name} to throw first.`, { text: 'Game on!', rate: 0.88, pitch: 1 }]);
  },
  score(n, bust = false) {
    if (bust || n === 0) return speak({ text: 'No score.', rate: 0.9 });
    if (n === 180) return speak({ text: 'One hundred... and eighty!', rate: 0.78, pitch: 1.08 });
    speak({ text: words(n), pitch: n >= 100 ? 1 : 0.92, rate: n >= 100 ? 0.9 : 0.95 });
  },
  require(name, rem) {
    speak(`${name}, you require ${words(rem)}.`, { interrupt: false });
  },
  leg(name, legNo, setWon) {
    speak([{ text: `Game shot, and the ${setWon ? 'set' : (ORD[legNo] || '') + ' leg'}!`, rate: 0.88, pitch: 1.02 }, name]);
  },
  match(name) {
    speak([{ text: 'Game shot, and the match!', rate: 0.85, pitch: 1.05 }, name]);
  },
  test() {
    speak(['Ladies and gentlemen.', 'Game on!', { text: 'One hundred... and eighty!', rate: 0.78, pitch: 1.08 }], { force: true });
  },
};
