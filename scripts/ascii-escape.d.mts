/** Escape Unicode non-characters to \uXXXX in a single built .js file. */
export function asciiEscapeFile(path: string): boolean;
/** Recursively sanitise every .js file under `dir`. Returns the count changed. */
export function asciiEscapeDir(dir: string): number;
