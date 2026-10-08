// Scales the amount an ingredient line starts with, such as "1½ dl" or "2–3", and leaves the rest
// as written. "2 x 400 g" scales the count, not the pack size. Lines without a leading amount, such
// as "Salt efter smak", stay as they are.

const unicodeFractions: Record<string, number> = {
  "⅛": 1 / 8,
  "¼": 1 / 4,
  "⅓": 1 / 3,
  "½": 1 / 2,
  "⅔": 2 / 3,
  "¾": 3 / 4,
};
const fractionChars = Object.keys(unicodeFractions).join("");

// A mixed number ("1 1/2"), a fraction ("1/2"), a decimal with an optional unicode fraction
// ("2,5", "1½", "1 ½"), or a unicode fraction alone ("½").
const numberPattern = `\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s?[${fractionChars}])?|[${fractionChars}]`;
const amountPattern = new RegExp(
  `^(${numberPattern})(?:(\\s*[-–]\\s*)(${numberPattern}))?(?=\\s|\\p{L}|$)`,
  "u",
);

// Whether the line writes "1 ½" rather than "1½", as US recipes tend to.
const spacedPattern = new RegExp(`\\d\\s+[\\d${fractionChars}]`, "u");

export type ScaledIngredient = {
  // The scaled amount, or null when the line has none or is unscaled.
  amount: string | null;
  rest: string;
};

export function scaleIngredient(
  line: string,
  factor: number,
  decimalSeparator: string,
): ScaledIngredient {
  if (factor === 1) return { amount: null, rest: line };
  const match = amountPattern.exec(line);
  const [whole, from, separator, to] = match ?? [];
  if (!whole || !from) return { amount: null, rest: line };

  const style = { decimalSeparator, spaced: spacedPattern.test(from) };
  const scale = (text: string) => formatAmount(parseAmount(text) * factor, text, style);
  const amount = to ? `${scale(from)}${separator}${scale(to)}` : scale(from);
  return { amount, rest: line.slice(whole.length) };
}

function parseAmount(text: string) {
  return text
    .trim()
    .split(/\s+|(?=[⅛¼⅓½⅔¾])/u)
    .reduce((sum, part) => {
      const fraction = unicodeFractions[part];
      if (fraction) return sum + fraction;
      const [numerator, denominator] = part.split("/");
      if (denominator) return sum + Number(numerator) / Number(denominator);
      return sum + Number(part.replace(",", "."));
    }, 0);
}

const fractionSteps = [
  [0, ""],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [1, ""],
] as const;

// Rounds like a cookbook: amounts written as decimals stay decimals, others use common fractions,
// and large amounts round to whole numbers, then to fives.
function formatAmount(
  value: number,
  original: string,
  style: { decimalSeparator: string; spaced: boolean },
) {
  if (value >= 100) return String(Math.round(value / 5) * 5);
  if (value >= 10) return String(Math.round(value));

  if (/[.,]/u.test(original)) {
    const rounded = Math.max(0.1, Math.round(value * 10) / 10);
    return String(rounded).replace(".", style.decimalSeparator);
  }

  // Too small for a quarter, but never rounded away.
  if (value < 1 / 6) return "⅛";
  let whole = Math.floor(value);
  const remainder = value - whole;
  const [step, symbol] = fractionSteps.reduce((closest, candidate) =>
    Math.abs(candidate[0] - remainder) < Math.abs(closest[0] - remainder) ? candidate : closest,
  );
  if (step === 1) whole += 1;
  if (!symbol) return String(whole);
  if (whole === 0) return symbol;
  return `${whole}${style.spaced ? " " : ""}${symbol}`;
}
