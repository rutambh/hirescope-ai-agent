// src/utils/sha256.ts
//
// Memory-safe incremental SHA-256 over Uint8Array, plus a file hasher that
// reads large files in chunks (so a ~500MB model can be verified on-device
// without loading the whole file into memory).
//
// The Sha256 implementation is validated against Node's crypto for empty /
// short / multi-block / padding-boundary inputs and for chunked-vs-whole
// hashing. Do not "simplify" the bit math without re-running those checks.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

export class Sha256 {
  private _h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  private _buffer = new Uint8Array(64);
  private _bufferLen = 0;
  private _total = 0;

  update(data: Uint8Array): this {
    let dataPos = 0;
    let dataLen = data.length;
    while (dataLen > 0) {
      const space = 64 - this._bufferLen;
      const take = Math.min(space, dataLen);
      this._buffer.set(data.subarray(dataPos, dataPos + take), this._bufferLen);
      this._bufferLen += take;
      dataPos += take;
      dataLen -= take;
      this._total += take;
      if (this._bufferLen === 64) {
        this._compress(this._buffer, 0);
        this._bufferLen = 0;
      }
    }
    return this;
  }

  private _compress(block: Uint8Array, offset: number): void {
    const w = new Uint32Array(64);
    const dv = new DataView(block.buffer, block.byteOffset + offset, 64);
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = this._h[0], b = this._h[1], c = this._h[2], d = this._h[3];
    let e = this._h[4], f = this._h[5], g = this._h[6], h = this._h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    this._h[0] = (this._h[0] + a) | 0;
    this._h[1] = (this._h[1] + b) | 0;
    this._h[2] = (this._h[2] + c) | 0;
    this._h[3] = (this._h[3] + d) | 0;
    this._h[4] = (this._h[4] + e) | 0;
    this._h[5] = (this._h[5] + f) | 0;
    this._h[6] = (this._h[6] + g) | 0;
    this._h[7] = (this._h[7] + h) | 0;
  }

  digest(): Uint8Array {
    const totalBits = this._total * 8;
    const bitLenHi = Math.floor(totalBits / 0x100000000);
    const bitLenLo = totalBits >>> 0;

    // Append 0x80 then zero-pad within the 64-byte buffer.
    this._buffer[this._bufferLen++] = 0x80;
    while (this._bufferLen !== 56) {
      if (this._bufferLen === 64) {
        this._compress(this._buffer, 0);
        this._bufferLen = 0;
      }
      this._buffer[this._bufferLen++] = 0;
    }
    const dv = new DataView(this._buffer.buffer, this._buffer.byteOffset, 64);
    dv.setUint32(56, bitLenHi);
    dv.setUint32(60, bitLenLo);
    this._compress(this._buffer, 0);

    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) odv.setUint32(i * 4, this._h[i]);
    return out;
  }

  hex(): string {
    const d = this.digest();
    let s = '';
    for (let i = 0; i < 32; i++) s += d[i].toString(16).padStart(2, '0');
    return s;
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LUT = new Int16Array(256).fill(-1);
for (let i = 0; i < 64; i++) B64_LUT[B64.charCodeAt(i)] = i;

export function base64ToUint8Array(b64: string): Uint8Array {
  const str = b64.replace(/[\r\n\s]/g, '');
  const outLen = Math.floor(str.length * 3 / 4);
  const out = new Uint8Array(outLen);
  let p = 0;
  for (let i = 0; i < str.length; i += 4) {
    const c0 = B64_LUT[str.charCodeAt(i)];
    const c1 = B64_LUT[str.charCodeAt(i + 1)];
    const c2 = B64_LUT[str.charCodeAt(i + 2)];
    const c3 = B64_LUT[str.charCodeAt(i + 3)];
    out[p++] = (c0 << 2) | (c1 >> 4);
    if (c2 !== -1) {
      out[p++] = ((c1 & 15) << 4) | (c2 >> 2);
      if (c3 !== -1) out[p++] = ((c2 & 3) << 6) | c3;
    }
  }
  return out;
}

// ─── File hashing (chunked, memory-safe) ───────────────────────────────────────

import * as FileSystem from 'expo-file-system';

const HASH_CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB per read

/**
 * SHA-256 of a file on disk, read in 4 MB base64 chunks so the entire file is
 * never held in memory at once. Returns lowercase hex.
 */
export async function sha256File(fileUri: string): Promise<string> {
  const ctx = new Sha256();
  let position = 0;
  // readAsStringAsync with encoding:'base64' + position + length returns the
  // base64 of `length` bytes starting at `position` (expo-file-system v18 API).
  while (true) {
    const b64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64' as any,
      position,
      length: HASH_CHUNK_BYTES,
    });
    if (!b64) break;
    const bytes = base64ToUint8Array(b64);
    ctx.update(bytes);
    position += bytes.length;
    if (bytes.length < HASH_CHUNK_BYTES) break;
  }
  return ctx.hex();
}
