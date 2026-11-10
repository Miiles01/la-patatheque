/** Public-folder URL that works both at the domain root and under a sub-path (GitHub Pages). */
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, "");
