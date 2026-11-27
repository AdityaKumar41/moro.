import { openSync, type Font } from "fontkit";
import { join } from "node:path";
const files = {
  sans: "arimo-700.woff",
  serif: "tinos-700.woff",
  mono: "cousine-700.woff",
} as const;
const cache = new Map<keyof typeof files, Font>();
export function printFont(name: keyof typeof files): Font {
  let font = cache.get(name);
  if (!font) {
    const loaded = openSync(
      join(process.cwd(), "assets", "print-fonts", files[name]),
    );
    if (!("layout" in loaded)) throw Error("Invalid bundled print font");
    font = loaded;
    cache.set(name, font);
  }
  return font;
}
