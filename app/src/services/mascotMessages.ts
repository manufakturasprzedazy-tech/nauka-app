// Py's lines — Polish, short, warm, a bit nerdy. Picked at random per context.

export type MascotContext =
  | 'greeting_morning'
  | 'greeting_day'
  | 'greeting_evening'
  | 'streak_danger'
  | 'streak_active'
  | 'first_run'
  | 'empty_state'
  | 'all_done';

const MESSAGES: Record<MascotContext, string[]> = {
  greeting_morning: [
    'Dzień dobry! Kawa ☕ i fiszki?',
    'Poranny mózg uczy się najlepiej. Sprawdzimy?',
    'Hej! Mały quiz na rozgrzewkę?',
  ],
  greeting_day: [
    'Hej! Gotowy na trochę Pythona?',
    'print("Witaj ponownie!")',
    'Każda lekcja to +1 do skilla 🐍',
  ],
  greeting_evening: [
    'Wieczorna sesja? Szanuję!',
    'Jeszcze jedna fiszka przed snem?',
    'Nocne kodowanie to najlepsze kodowanie.',
  ],
  streak_danger: [
    'Twoja seria wisi na włosku! Szybka fiszka?',
    'Nie pozwól, by seria spłonęła! 🔥',
  ],
  streak_active: [
    'Seria rośnie! Jestem z Ciebie dumny.',
    'Konsekwencja > motywacja. Dowozisz!',
  ],
  first_run: [
    'Cześć! Jestem Py 🐍 — pomogę Ci ogarnąć Pythona.',
  ],
  empty_state: [
    'Pusto tu... ale to dobry znak — wszystko zrobione!',
    'Nic do roboty? Czas na powtórkę!',
  ],
  all_done: [
    'Wszystko na dziś zrobione. Jesteś maszyną!',
    'Cel dzienny zaliczony! 🎉',
  ],
};

export function mascotSay(context: MascotContext): string {
  const list = MESSAGES[context];
  return list[Math.floor(Math.random() * list.length)];
}

export function greetingContext(): MascotContext {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'greeting_morning';
  if (h >= 12 && h < 19) return 'greeting_day';
  return 'greeting_evening';
}
