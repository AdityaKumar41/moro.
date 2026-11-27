/** Real objects photographed by independent creators. Asset licences are
 * independent of the application's MIT licence; preserve these credits. */
export const gallery = [
  {
    product: "labels",
    title: "Small stickers. Big personality.",
    detail: "A printed FreeBSD sticker sheet",
    alt: "A sheet of printed FreeBSD stickers in different sizes and shapes",
    creator: "FAndrey",
    file: "FreeBSD Sticker Sheet (16 stickers) (44107423534).png",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  {
    product: "race",
    title: "Every number has a story.",
    detail: "A marathon bib, worn with pride",
    alt: "A runner wearing a printed number 4227 marathon bib and finisher medals",
    creator: "Staff Sgt. Natasha Stannard / U.S. Air Force",
    file: "A running bond 141119-F-GX122-011.jpg",
    license: "Public domain (U.S. government)",
    licenseUrl:
      "https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force",
  },
  {
    product: "mtb",
    title: "Ready for the next trail.",
    detail: "Number boards at Dusk til Dawn, Thetford Forest",
    alt: "Mountain bike riders on a forest trail with printed race boards fixed to their handlebars",
    creator: "Andy Armstrong",
    file: "Mountain-bike-racing.jpg",
    license: "CC BY-SA 2.5",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.5/",
  },
  {
    product: "stamps",
    title: "A mark worth repeating.",
    detail: "A character-wheel rubber stamp and ink pad",
    alt: "A metal character-wheel rubber stamp resting on its open ink pad",
    creator: "Dvortygirl",
    file: "Rubber stamp IMG 20190427 113849721 HDR.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    product: "trophies",
    title: "Give a moment its shape.",
    detail: "Most Wanted awards by Midton Acrylics",
    alt: "Two black acrylic Most Wanted trophies with printed pink and white lettering",
    creator: "Craig Cameron",
    file: "Most Wanted Award by Midton Acrylics.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    product: "laser",
    title: "The beauty is in the detail.",
    detail: "An intricate wood panel by Lightwave Laser",
    alt: "A close view of a real wood panel laser-cut into an intricate leaf pattern",
    creator: "Lightwave / Lightwave Laser",
    file: "Laser cut wood detail.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
] as const;
export function gallerySource(file: string) {
  return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file);
}
