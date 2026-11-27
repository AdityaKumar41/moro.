import { fitLayer } from "./studio-geometry";
import type { Artwork, Configuration } from "./catalog";
export type LayerCommand =
  | "delete"
  | "duplicate"
  | "forward"
  | "backward"
  | "front"
  | "back"
  | "lock"
  | "visibility";
export function applyLayerCommand(
  artwork: Artwork,
  selected: string,
  command: LayerCommand,
  configuration: Configuration,
  newId = crypto.randomUUID(),
) {
  const index = artwork.layers.findIndex((l) => l.id === selected);
  if (index < 0) return null;
  const layer = artwork.layers[index];
  if (layer.locked && !["lock", "visibility"].includes(command)) return null;
  const layers = [...artwork.layers];
  let selection = selected;
  if (command === "delete") {
    layers.splice(index, 1);
    selection = layers[Math.min(index, layers.length - 1)]?.id || "";
  } else if (command === "duplicate") {
    if (layers.length >= 30) return null;
    const copy = fitLayer(
      { ...layer, id: newId, x: layer.x + 25, y: layer.y + 25 },
      configuration,
    );
    layers.splice(index + 1, 0, copy);
    selection = newId;
  } else if (command === "lock")
    layers[index] = { ...layer, locked: !layer.locked };
  else if (command === "visibility")
    layers[index] = { ...layer, hidden: !layer.hidden };
  else {
    const target =
      command === "front"
        ? layers.length - 1
        : command === "back"
          ? 0
          : command === "forward"
            ? Math.min(index + 1, layers.length - 1)
            : Math.max(index - 1, 0);
    if (target === index) return null;
    layers.splice(index, 1);
    layers.splice(target, 0, layer);
  }
  return { artwork: { ...artwork, layers }, selected: selection };
}
export function studioShortcut(
  key: string,
  options: { typing: boolean; modal: boolean; command: boolean; alt: boolean },
) {
  if (options.typing || options.modal || options.alt) return null;
  if (!options.command && ["Delete", "Backspace"].includes(key))
    return "delete";
  if (options.command && key.toLowerCase() === "d") return "duplicate";
  return null;
}

export function moveLayerTo(artwork: Artwork, id: string, targetId: string) {
  const from = artwork.layers.findIndex((l) => l.id === id),
    to = artwork.layers.findIndex((l) => l.id === targetId);
  if (from < 0 || to < 0 || from === to || artwork.layers[from].locked)
    return null;
  const layers = [...artwork.layers];
  const [layer] = layers.splice(from, 1);
  layers.splice(to, 0, layer);
  return { ...artwork, layers };
}
