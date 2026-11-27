# Studio journey

Visitors can explore and keep a draft in their tab. Sign-in is required for cloud saving, private uploads and orders; explain the benefit without interrupting every edit. Return-to-studio destinations are allowlisted and recovered resources are owner-checked.

Authenticated editing uses debounced serialized cloud saves, visible save status and save-before-exit/checkout. The order API also persists a project so checkout cannot strand artwork only in an order snapshot. Local drafts expire after 24 hours and cannot be recovered into a different signed-in owner.

Editing includes text double-click/Enter/F2, Delete/Backspace, undo/redo, duplicate, keyboard movement, context menu and layer rename/reorder/lock/hide. Shortcuts must respect focused inputs/dialogs. Hidden layers are excluded consistently from previews, preflight and print generation. Blank drafts are allowed; empty/fully hidden orders are rejected.

Image normalization supports JPEG/PNG/WebP with pixel/document limits, alpha preservation and actionable errors. CSV data and source metadata round-trip with saved projects and reorders. Finished single-page PDF, PDF-compatible AI, static self-contained SVG and PNG are prepared in a bounded server worker and placed on the canvas. Signed metadata binds the original source path to the visible prepared image. Checkout rejects an unprepared, hidden, replaced or forged source. Existing attached files have a Prepare artwork action. Source imports follow the automatic paid-proof pipeline; they never render the starter design instead.
