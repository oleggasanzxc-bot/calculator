const ONES_MASCULINE = [
  "",
  "один",
  "два",
  "три",
  "чотири",
  "п’ять",
  "шість",
  "сім",
  "вісім",
  "дев’ять",
] as const;

const ONES_FEMININE = [
  "",
  "одна",
  "дві",
  "три",
  "чотири",
  "п’ять",
  "шість",
  "сім",
  "вісім",
  "дев’ять",
] as const;

const TEENS = [
  "десять",
  "одинадцять",
  "дванадцять",
  "тринадцять",
  "чотирнадцять",
  "п’ятнадцять",
  "шістнадцять",
  "сімнадцять",
  "вісімнадцять",
  "дев’ятнадцять",
] as const;

const TENS = [
  "",
  "",
  "двадцять",
  "тридцять",
  "сорок",
  "п’ятдесят",
  "шістдесят",
  "сімдесят",
  "вісімдесят",
  "дев’яносто",
] as const;

const HUNDREDS = [
  "",
  "сто",
  "двісті",
  "триста",
  "чотириста",
  "п’ятсот",
  "шістсот",
  "сімсот",
  "вісімсот",
  "дев’ятсот",
] as const;

type WordForms = readonly [string, string, string];

interface Scale {
  forms: WordForms;
  feminine: boolean;
}

const SCALES: readonly Scale[] = [
  { forms: ["", "", ""], feminine: true },
  { forms: ["тисяча", "тисячі", "тисяч"], feminine: true },
  { forms: ["мільйон", "мільйони", "мільйонів"], feminine: false },
  { forms: ["мільярд", "мільярди", "мільярдів"], feminine: false },
  { forms: ["трильйон", "трильйони", "трильйонів"], feminine: false },
] as const;

const HRYVNIA_FORMS: WordForms = ["гривня", "гривні", "гривень"];
const KOPIYKA_FORMS: WordForms = ["копійка", "копійки", "копійок"];
const MAX_INTEGER = 999_999_999_999_999n;

export type AmountConversion =
  | { ok: true; text: string; integer: bigint; kopiyky: number }
  | { ok: false; error: string };

/** Selects a Ukrainian noun form using the final two digits. */
export function selectWordForm(value: bigint | number, forms: WordForms): string {
  const normalized = typeof value === "bigint" ? value : BigInt(value);
  const lastTwo = Number(normalized % 100n);

  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];

  const last = Number(normalized % 10n);
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/** Converts a number from 1 to 999 into Ukrainian words. */
export function tripletToWords(value: number, feminine = false): string {
  if (!Number.isInteger(value) || value < 0 || value > 999) {
    throw new RangeError("Трійка цифр має бути цілим числом від 0 до 999");
  }

  const words: string[] = [];
  const hundreds = Math.floor(value / 100);
  const lastTwo = value % 100;

  if (hundreds) words.push(HUNDREDS[hundreds]);

  if (lastTwo >= 10 && lastTwo <= 19) {
    words.push(TEENS[lastTwo - 10]);
  } else {
    const tens = Math.floor(lastTwo / 10);
    const ones = lastTwo % 10;
    if (tens) words.push(TENS[tens]);
    if (ones) words.push((feminine ? ONES_FEMININE : ONES_MASCULINE)[ones]);
  }

  return words.join(" ");
}

function integerToWords(value: bigint): string {
  if (value === 0n) return "нуль";

  const parts: string[] = [];
  let remainder = value;
  let scaleIndex = 0;

  while (remainder > 0n) {
    const triplet = Number(remainder % 1000n);
    if (triplet > 0) {
      const scale = SCALES[scaleIndex];
      const groupWords = tripletToWords(triplet, scale.feminine);
      const scaleWord = scaleIndex
        ? selectWordForm(triplet, scale.forms)
        : "";
      parts.unshift([groupWords, scaleWord].filter(Boolean).join(" "));
    }

    remainder /= 1000n;
    scaleIndex += 1;
  }

  return parts.join(" ");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normalizeAmountInput(input: string):
  | { ok: true; integer: bigint; kopiyky: number }
  | { ok: false; error: string } {
  const compact = input.replace(/[\s\u00a0\u202f]/gu, "");

  if (!compact) return { ok: false, error: "Введіть суму" };
  if (/[-+]/u.test(compact)) {
    return { ok: false, error: "Введіть невід’ємну суму без знака" };
  }
  if (!/^\d+(?:[.,]\d{0,2})?$/u.test(compact)) {
    return {
      ok: false,
      error: "Використовуйте лише цифри та не більше двох знаків копійок",
    };
  }

  const [integerPart, fraction = ""] = compact.split(/[.,]/u);
  const integer = BigInt(integerPart);
  if (integer > MAX_INTEGER) {
    return {
      ok: false,
      error: "Підтримуються суми до 999 трильйонів включно",
    };
  }

  return {
    ok: true,
    integer,
    kopiyky: Number(fraction.padEnd(2, "0") || "00"),
  };
}

/** Converts an entered amount to grammatically correct Ukrainian words. */
export function amountToWordsUk(input: string | bigint | number): AmountConversion {
  if (typeof input === "number" && (!Number.isFinite(input) || input < 0)) {
    return { ok: false, error: "Введіть коректну невід’ємну суму" };
  }

  const normalized = normalizeAmountInput(String(input));
  if (!normalized.ok) return normalized;

  const { integer, kopiyky } = normalized;
  const words = integerToWords(integer);
  const result = [
    words,
    selectWordForm(integer, HRYVNIA_FORMS),
    kopiyky.toString().padStart(2, "0"),
    selectWordForm(kopiyky, KOPIYKA_FORMS),
  ].join(" ");

  return { ok: true, text: capitalize(result), integer, kopiyky };
}
