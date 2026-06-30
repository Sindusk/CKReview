import path from "path";

const rootDir = path.resolve(__dirname, "..");

export const OUTPUT = path.join(rootDir, "public", "wow", "icons");

export const CACHE = path.join(rootDir, "asset-builder", "cache");