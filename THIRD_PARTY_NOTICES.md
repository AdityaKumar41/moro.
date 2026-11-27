# Third-party notices

The repository's original application code is MIT licensed. Dependencies and bundled assets retain their original licenses; MIT does not relicense third-party material or grant trademark rights.

- **Trazo stickers** (`trazo-stickers`): MIT. Retained license: [docs/licenses/Trazo-MIT.txt](docs/licenses/Trazo-MIT.txt). The application imports the published package for decorative vector artwork.
- **Arimo, Tinos and Cousine print fonts**: SIL Open Font License 1.1. Font bytes are bundled under `assets/print-fonts/` with the corresponding original `*-LICENSE.txt` files. Preserve these notices when redistributing the fonts.
- **DM Sans, Manrope and IBM Plex Mono**: installed through Fontsource packages and self-hosted by the build; original notices are retained under `docs/licenses/` as well as in the installed dependency distributions. They remain subject to their respective font licenses.
- **Lucide icons** and all runtime/build packages: see their installed package licenses and the pinned dependency graph in `package-lock.json`.
- `public/images/print-kit.webp` and its original PNG are generated concept illustrations created for this project. They do not depict certified customer work or establish manufacturing capability.

The original assignment PDF and supplied reference images/video are not included in the public repository or covered by the project's MIT license. Do not add them or customer-supplied artwork without redistribution permission. Design references are inspiration only; third-party page artwork is not copied into the project.

## Real-work gallery photographs

These photographs show independent work, not Moro commissions or endorsements. Each is resized and converted to WebP; responsive display may crop the image. The adapted images retain the respective licence below, including share-alike requirements. Preserve creator, source and licence links when redistributing them. Trademark rights are not granted by the image licences.

| Asset in `public/images/gallery/` | Creator | Source | Licence |
| --- | --- | --- | --- |
| labels.webp | FAndrey | [FreeBSD Sticker Sheet](https://commons.wikimedia.org/wiki/File:FreeBSD_Sticker_Sheet_%2816_stickers%29_%2844107423534%29.png) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| race.webp | Staff Sgt. Natasha Stannard / U.S. Air Force | [A running bond](https://commons.wikimedia.org/wiki/File:A_running_bond_141119-F-GX122-011.jpg) | [Public domain — U.S. government](https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force) |
| mtb.webp | Andy Armstrong | [Mountain-bike-racing](https://commons.wikimedia.org/wiki/File:Mountain-bike-racing.jpg) | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/) |
| stamps.webp | Dvortygirl | [Rubber stamp](https://commons.wikimedia.org/wiki/File:Rubber_stamp_IMG_20190427_113849721_HDR.jpg) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| trophies.webp | Craig Cameron | [Most Wanted Award by Midton Acrylics](https://commons.wikimedia.org/wiki/File:Most_Wanted_Award_by_Midton_Acrylics.jpg) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| laser.webp | Lightwave / Lightwave Laser | [Laser cut wood detail](https://commons.wikimedia.org/wiki/File:Laser_cut_wood_detail.jpg) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |

The source-file descriptions and licences were checked on 27 November 2026. UI attribution is driven by `lib/gallery.ts`. The app's MIT licence does not replace any of these asset licences.

## Automatic source-artwork rendering

- `@hyzyla/pdfium` wraps PDFium for PDF/PDF-compatible Illustrator rendering. Retained wrapper MIT notice: `docs/licenses/PDFium-wrapper-MIT.txt`. Upstream PDFium and its components retain their licences; see the retained `docs/licenses/PDFium-third-party.txt` and https://pdfium.googlesource.com/pdfium/+/main/LICENSE.
- `@resvg/resvg-js` is MPL-2.0; retained licence: `docs/licenses/Resvg-MPL-2.0.txt`. The unmodified renderer is used as a dependency; its upstream source is https://github.com/thx/resvg-js.
- `@xmldom/xmldom` is MIT; retained notice: `docs/licenses/Xmldom-MIT.txt`.
- The additional Arimo, Tinos and Cousine TTF files are lossless container conversions of the corresponding Fontsource WOFF files. They retain the original SIL Open Font Licences already stored with the fonts. No glyphs or family names were changed.
