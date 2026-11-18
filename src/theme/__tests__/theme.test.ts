import { colors, navigationTheme } from "../index";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((part) => parseInt(part, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test.each(["light", "dark"] as const)(
  "%s theme keeps text and controls readable",
  (scheme) => {
    const palette = colors[scheme];
    for (const surface of [palette.background, palette.surface]) {
      expect(contrast(palette.text, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.muted, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.error, surface)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(palette.primary, palette.onPrimary)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(palette.border, palette.surface)).toBeGreaterThanOrEqual(3);
    expect(navigationTheme(scheme).colors.background).toBe(palette.background);
  },
);
