// lib/wow-map-art.ts — SERVER ONLY (uses fs).
//
// The in-game map of a WoW zone for the replay's background, built from
// Blizzard's own map art. WCL's API names a fight's map (`fights.maps`, a
// UiMap id) but has no image or calibration, and its replay assets sit
// behind a human-verification wall. Blizzard's db2 tables, served by
// wago.tools, have both:
//   UiMapXMapArt (UiMap → UiMapArt) → UiMapArt (style) →
//   UiMapArtStyleLayer (canvas and tile size) → UiMapArtTile (one BLP2
//   texture per row/column), and UiMapAssignment (the world box the map
//   covers).
// The tiles are fetched once per map, decoded, stitched into a PNG and
// cached under data/wow-maps/ (gitignored: the art is Blizzard's, so it is
// built on the server rather than committed to the public repo).
//
// Calibration: an assignment maps world X (north) to the map's vertical
// axis, top = max X, and world Y (west) to its horizontal one, left = max
// Y. In the replay's log units (wow-replay.ts: x = −Y·100, y = −X·100) the
// image's left edge is x = −Ymax·100 and its top y = −Xmax·100. Checked on
// The Venomous Abyss (UiMap 2608): the Vashnik kill's positions land in
// the lower-left room.

import fs from "fs/promises";
import path from "path";
import zlib from "zlib";

const WAGO = "https://wago.tools";
const CACHE_DIR = path.join(process.cwd(), "data", "wow-maps");

/** Where the map image sits, in the replay's log units (centi-yards, +x east, +y south). */
export type WowMapArt = {
  uiMapId: number;
  x: number; y: number;           // image's left / top edge
  width: number; height: number;  // image's extent
  pixels: [number, number];       // image size in px
};

type Row = Record<string, string>;

async function csv(table: string, field: string, value: number): Promise<Row[]> {
  const res = await fetch(`${WAGO}/db2/${table}/csv?filter%5B${field}%5D=${value}`);
  if (!res.ok) throw new Error(`wago.tools ${table} lookup failed (${res.status})`);
  const lines = (await res.text()).trim().split(/\r?\n/);
  if (lines.length < 2 || lines[0].startsWith("{")) return [];
  const head = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [head[i], v])));
}

// ── BLP2 decoding (palettized, DXT1/3/5, raw BGRA): mip 0 only ──

function decodeBlp(buf: Buffer): { w: number; h: number; rgba: Buffer } {
  if (buf.toString("latin1", 0, 4) !== "BLP2") throw new Error("Not a BLP2 texture");
  const enc = buf[8], alphaDepth = buf[9], alphaEnc = buf[10];
  const w = buf.readUInt32LE(12), h = buf.readUInt32LE(16);
  const off = buf.readUInt32LE(20), size = buf.readUInt32LE(84);
  const d = buf.subarray(off, off + size);
  const out = Buffer.alloc(w * h * 4);
  if (enc === 1) {
    for (let i = 0; i < w * h; i++) {
      const p = 148 + d[i] * 4;   // palette: 256 BGRA entries after the header
      out[i * 4] = buf[p + 2]; out[i * 4 + 1] = buf[p + 1]; out[i * 4 + 2] = buf[p];
      out[i * 4 + 3] = alphaDepth === 8 ? d[w * h + i] : 255;
    }
    return { w, h, rgba: out };
  }
  if (enc === 3) {
    for (let i = 0; i < w * h; i++) {
      out[i * 4] = d[i * 4 + 2]; out[i * 4 + 1] = d[i * 4 + 1]; out[i * 4 + 2] = d[i * 4]; out[i * 4 + 3] = d[i * 4 + 3];
    }
    return { w, h, rgba: out };
  }
  // DXT: alphaEnc 0 = DXT1, 1 = DXT3, 7 = DXT5.
  const dxt1 = alphaEnc === 0;
  const c565 = (v: number) => [((v >> 11) & 31) * 255 / 31 | 0, ((v >> 5) & 63) * 255 / 63 | 0, (v & 31) * 255 / 31 | 0];
  let p = 0;
  for (let by = 0; by < h; by += 4) for (let bx = 0; bx < w; bx += 4) {
    const alpha = new Array<number>(16).fill(255);
    if (!dxt1) {
      if (alphaEnc === 1) {
        for (let i = 0; i < 16; i++) alpha[i] = ((d[p + (i >> 1)] >> ((i & 1) * 4)) & 15) * 17;
      } else {
        const a0 = d[p], a1 = d[p + 1], a = [a0, a1];
        if (a0 > a1) for (let i = 1; i < 7; i++) a.push(((7 - i) * a0 + i * a1) / 7 | 0);
        else { for (let i = 1; i < 5; i++) a.push(((5 - i) * a0 + i * a1) / 5 | 0); a.push(0, 255); }
        let bits = 0;
        // 48 bits of 3-bit indices: two 24-bit halves keep this in safe integer range.
        for (let half = 0; half < 2; half++) {
          bits = d[p + 2 + half * 3] | (d[p + 3 + half * 3] << 8) | (d[p + 4 + half * 3] << 16);
          for (let i = 0; i < 8; i++) alpha[half * 8 + i] = a[(bits >> (3 * i)) & 7];
        }
      }
      p += 8;
    }
    const v0 = d.readUInt16LE(p), v1 = d.readUInt16LE(p + 2);
    const c0 = c565(v0), c1 = c565(v1);
    const cs = v0 > v1 || !dxt1
      ? [c0, c1, c0.map((x, i) => (2 * x + c1[i]) / 3 | 0), c0.map((x, i) => (x + 2 * c1[i]) / 3 | 0)]
      : [c0, c1, c0.map((x, i) => (x + c1[i]) / 2 | 0), [0, 0, 0]];
    const idx = d.readUInt32LE(p + 4);
    for (let i = 0; i < 16; i++) {
      const x = bx + (i & 3), y = by + (i >> 2);
      if (x >= w || y >= h) continue;
      const ci = (idx >>> (2 * i)) & 3, c = cs[ci], o = (y * w + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
      out[o + 3] = dxt1 && v0 <= v1 && ci === 3 ? 0 : alpha[i];
    }
    p += 8;
  }
  return { w, h, rgba: out };
}

// ── PNG encoding (RGBA, no filtering) ──

const CRC_TABLE = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();

function encodePng(w: number, h: number, rgba: Buffer): Buffer {
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, c]);
  };
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// ── Building and caching ──

async function build(uiMapId: number): Promise<{ meta: WowMapArt; png: Buffer }> {
  const link = (await csv("UiMapXMapArt", "UiMapID", uiMapId)).sort((a, b) => Number(a.PhaseID) - Number(b.PhaseID))[0];
  if (!link) throw new Error(`No map art for UiMap ${uiMapId}`);
  const artId = Number(link.UiMapArtID);
  const art = (await csv("UiMapArt", "ID", artId))[0];
  const layer = (await csv("UiMapArtStyleLayer", "UiMapArtStyleID", Number(art?.UiMapArtStyleID ?? 1)))
    .find((l) => l.LayerIndex === "0");
  if (!layer) throw new Error(`No art style layer for UiMap ${uiMapId}`);
  const W = Number(layer.LayerWidth), H = Number(layer.LayerHeight);
  const tileW = Number(layer.TileWidth), tileH = Number(layer.TileHeight);

  const assign = (await csv("UiMapAssignment", "UiMapID", uiMapId))
    .find((a) => Number(a.UiMax_0) > Number(a.UiMin_0) && Number(a.UiMax_1) > Number(a.UiMin_1));
  if (!assign) throw new Error(`No world bounds for UiMap ${uiMapId}`);
  const [minX, minY, maxX, maxY] = [assign.Region_0, assign.Region_1, assign.Region_3, assign.Region_4].map(Number);
  const [u0, v0, u1, v1] = [assign.UiMin_0, assign.UiMin_1, assign.UiMax_0, assign.UiMax_1].map(Number);
  // The assignment may cover only part of the map: extend its box to the full canvas.
  const fullY = (maxY - minY) / (u1 - u0), fullX = (maxX - minX) / (v1 - v0);
  const leftY = maxY + u0 * fullY, topX = maxX + v0 * fullX;

  const canvas = Buffer.alloc(W * H * 4);
  const tiles = (await csv("UiMapArtTile", "UiMapArtID", artId)).filter((t) => t.LayerIndex === "0");
  for (const t of tiles) {
    const res = await fetch(`${WAGO}/api/casc/${t.FileDataID}?download`);
    if (!res.ok) throw new Error(`Map tile ${t.FileDataID} download failed (${res.status})`);
    const tex = decodeBlp(Buffer.from(await res.arrayBuffer()));
    const ox = Number(t.ColIndex) * tileW, oy = Number(t.RowIndex) * tileH;
    for (let y = 0; y < tex.h && oy + y < H; y++) {
      const n = Math.min(tex.w, W - ox);
      if (n > 0) tex.rgba.copy(canvas, ((oy + y) * W + ox) * 4, y * tex.w * 4, (y * tex.w + n) * 4);
    }
  }
  return {
    meta: { uiMapId, x: -leftY * 100, y: -topX * 100, width: fullY * 100, height: fullX * 100, pixels: [W, H] },
    png: encodePng(W, H, canvas),
  };
}

const inFlight = new Map<number, Promise<{ meta: WowMapArt; png: Buffer }>>();

/** The map's calibration and PNG, from the disk cache or built once from wago.tools. */
export async function getWowMapArt(uiMapId: number): Promise<{ meta: WowMapArt; png: Buffer }> {
  const base = path.join(CACHE_DIR, String(uiMapId));
  try {
    const [meta, png] = await Promise.all([fs.readFile(`${base}.json`, "utf-8"), fs.readFile(`${base}.png`)]);
    return { meta: JSON.parse(meta), png };
  } catch { /* not cached yet */ }
  let p = inFlight.get(uiMapId);
  if (!p) {
    p = build(uiMapId).then(async (r) => {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await Promise.all([fs.writeFile(`${base}.json`, JSON.stringify(r.meta)), fs.writeFile(`${base}.png`, r.png)]);
      return r;
    }).finally(() => inFlight.delete(uiMapId));
    inFlight.set(uiMapId, p);
  }
  return p;
}
