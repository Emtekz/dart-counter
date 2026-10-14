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
  else if (/^en[-_](IE|AU|NZ)/i.test(v.lang)) s += 16;
  else if (/^en/i.test(v.lang)) s += 6;
  // Männliche, tiefere Stimmen bevorzugen (\b verhindert, dass „Female“ als „male“ zählt)
  if (/\b(male|ryan|thomas|george|oliver|arthur|daniel|guy|alfie|elliot|noah|rishi|aaron|fred)\b/i.test(v.name)) s += 22;
  if (/\bfemale\b|libby|sonia|hazel|susan|kate|serena|maisie|samantha|karen|moira|tessa|fiona|martha|zira|catherine|victoria/i.test(v.name)) s -= 25;
  if (/natural|neural|premium|enhanced/i.test(v.name)) s += 22; // klingt weniger roboterhaft
  if (v.localService) s += 18; // Stimme auf dem Gerät = keine Verzögerung durchs Internet
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

/** Spricht einen oder mehrere Sätze. pitch/rate der Zeilen sind relativ zur Grundeinstellung. */
function speak(lines, { interrupt = true, force = false } = {}) {
  if ((!db.settings.speech && !force) || !supported()) return;
  if (interrupt && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
  const voice = currentVoice();
  const basePitch = db.settings.callerPitch ?? 0.8;
  const baseRate = db.settings.callerRate ?? 1;
  for (const l of [].concat(lines)) {
    const line = typeof l === 'string' ? { text: l } : l;
    const u = new SpeechSynthesisUtterance(line.text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-GB';
    u.pitch = Math.min(2, basePitch * (line.pitch ?? 1));
    u.rate = Math.min(2, baseRate * (line.rate ?? 1));
    speechSynthesis.speak(u);
  }
}

/** Sprach-Engine beim ersten Antippen „aufwärmen“ – verkürzt die Verzögerung der ersten Ansage. */
let warmed = false;
export function warmUp() {
  if (warmed || !supported() || !db.settings.speech) return;
  warmed = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  const voice = currentVoice();
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

export const caller = {
  bullWinner(name) {
    speak(`${name} wins the bull and throws first. Game on!`);
  },
  gameOn(name) {
    speak(`${name} to throw first. Game on!`);
  },
  score(n, bust = false) {
    if (bust || n === 0) return speak('No score.');
    if (n === 180) return speak({ text: 'One hundred and eighty!', rate: 0.82, pitch: 1.08 });
    speak({ text: words(n), rate: n >= 100 ? 0.94 : 1 });
  },
  require(name, rem) {
    speak(`${name}, you require ${words(rem)}.`, { interrupt: false });
  },
  leg(name, legNo, setWon) {
    speak({ text: `Game shot, and the ${setWon ? 'set' : (ORD[legNo] || '') + ' leg'}! ${name}.`, rate: 0.92 });
  },
  match(name) {
    speak({ text: `Game shot, and the match! ${name}.`, rate: 0.9 });
  },
  test() {
    speak(['Game on!', { text: 'One hundred and eighty!', rate: 0.82, pitch: 1.08 }], { force: true });
  },
};
