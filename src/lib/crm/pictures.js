/** A usable picture address: only real http(s) links. Imported Perfex file names ("tech.jpeg") are ignored until the files exist in the Space. */
export const realPicture = (u) => (/^https?:\/\//i.test(u || '') ? u : null)
