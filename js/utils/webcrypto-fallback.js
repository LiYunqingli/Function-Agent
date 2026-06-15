/**
 * WebCrypto API 纯 JS fallback
 *
 * 用途：当 crypto.subtle 不可用时（如 file:// 协议下某些浏览器配置、某些受限 webview、
 * 浏览器扩展拦截 crypto 对象等），提供 PBKDF2-SHA256 密钥派生 与 AES-256-GCM 加解密的
 * 纯 JS 实现。
 *
 * 注意：
 * - 仅做功能性兼容，不提供 WebCrypto 的完整 surface。
 * - 仅实现本项目需要的几个方法：deriveBits、encrypt、decrypt（AES-GCM）。
 * - 性能：纯 JS 实现比原生 WebCrypto 慢数十倍到数百倍，仅作为兜底使用。
 *
 * 导出 API：
 *   window.WebCryptoFallback.subtle  —— 一个与原生 SubtleCrypto 接口子集兼容的对象
 *   window.WebCryptoFallback.isAvailable()  —— 原始 crypto.subtle 是否可用
 */

(function (global) {
  'use strict';

  // ============================================================
  // PBKDF2-HMAC-SHA256 纯 JS 实现
  // ============================================================

  function rotr(n, x) {
    return (x >>> n) | (x << (32 - n));
  }

  function sha256(message) {
    // 接受 Uint8Array，返回 Uint8Array (32 字节)
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    const ml = message.length * 8;
    // padding: 1 bit + zeros + 64-bit length
    const padLen = (((message.length + 9) + 63) & ~63) - message.length;
    const padded = new Uint8Array(message.length + padLen);
    padded.set(message);
    padded[message.length] = 0x80;
    // 写入长度（大端）
    const view = new DataView(padded.buffer);
    // 高 32 位放 0（> 2^32 位的输入不处理），低 32 位放位长度
    view.setUint32(padded.length - 4, ml & 0xffffffff, false);

    const W = new Uint32Array(64);
    for (let i = 0; i < padded.length; i += 64) {
      for (let t = 0; t < 16; t++) {
        W[t] = view.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
        const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3];
      let e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
        const ch = (e & f) ^ ((~e) & g);
        const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
        const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
        const mj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + mj) | 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }
      H[0] = (H[0] + a) | 0;
      H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0;
      H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0;
      H[7] = (H[7] + h) | 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i], false);
    return out;
  }

  function hmacSha256(key, message) {
    if (key.length > 64) key = sha256(key);
    if (key.length < 64) {
      const padded = new Uint8Array(64);
      padded.set(key);
      key = padded;
    }
    const oKey = new Uint8Array(64);
    const iKey = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      oKey[i] = key[i] ^ 0x5c;
      iKey[i] = key[i] ^ 0x36;
    }
    const inner = sha256(concat(iKey, message));
    return sha256(concat(oKey, inner));
  }

  function concat(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function xorBytes(a, b) {
    const out = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
    return out;
  }

  function pbkdf2(passwordBytes, salt, iterations, dkLen) {
    // dkLen 以字节为单位，最大 32 * 2^32 - 1（实际我们只需 32）
    const hLen = 32;
    const l = Math.ceil(dkLen / hLen);
    const r = dkLen - (l - 1) * hLen;
    const out = new Uint8Array(l * hLen);
    for (let i = 1; i <= l; i++) {
      const block = new Uint8Array(salt.length + 4);
      block.set(salt, 0);
      new DataView(block.buffer).setUint32(salt.length, i, false);
      let u = hmacSha256(passwordBytes, block);
      const t = new Uint8Array(u);
      for (let j = 1; j < iterations; j++) {
        u = hmacSha256(passwordBytes, u);
        for (let k = 0; k < t.length; k++) t[k] ^= u[k];
      }
      out.set(t, (i - 1) * hLen);
    }
    return out.slice(0, dkLen);
  }

  // ============================================================
  // AES-256 加密（ECB 模式）纯 JS 实现
  // 用途：作为 GCM 模式的基础构件（GHASH 使用）
  // ============================================================

  const SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
  ];

  const RCON = [
    0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
  ];

  function subWord(w) {
    return ((SBOX[(w >>> 24) & 0xff] << 24) |
            (SBOX[(w >>> 16) & 0xff] << 16) |
            (SBOX[(w >>> 8) & 0xff] << 8) |
            SBOX[w & 0xff]) >>> 0;
  }

  function rotWord(w) {
    return ((w << 8) | (w >>> 24)) >>> 0;
  }

  function keyExpansion(key) {
    // key: 32 字节 (AES-256)
    const Nb = 4, Nk = 8, Nr = 14;
    const w = new Uint32Array(Nb * (Nr + 1));
    for (let i = 0; i < Nk; i++) {
      w[i] = (key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3];
      w[i] = w[i] >>> 0;
    }
    for (let i = Nk; i < Nb * (Nr + 1); i++) {
      let temp = w[i - 1];
      if (i % Nk === 0) {
        temp = subWord(rotWord(temp)) ^ (RCON[i / Nk] << 24);
      } else if (i % Nk === 4) {
        temp = subWord(temp);
      }
      w[i] = (w[i - Nk] ^ temp) >>> 0;
    }
    return w;
  }

  function xtime(x) {
    return ((x << 1) ^ (((x >>> 7) & 1) * 0x1b)) & 0xff;
  }

  function mixColumns(state) {
    for (let i = 0; i < 4; i++) {
      const c = i * 4;
      const a0 = state[c], a1 = state[c + 1], a2 = state[c + 2], a3 = state[c + 3];
      const t = a0 ^ a1 ^ a2 ^ a3;
      state[c]     ^= t ^ xtime(a0 ^ a1);
      state[c + 1] ^= t ^ xtime(a1 ^ a2);
      state[c + 2] ^= t ^ xtime(a2 ^ a3);
      state[c + 3] ^= t ^ xtime(a3 ^ a0);
    }
  }

  function invMixColumns(state) {
    for (let i = 0; i < 4; i++) {
      const c = i * 4;
      const a0 = state[c], a1 = state[c + 1], a2 = state[c + 2], a3 = state[c + 3];
      const u = xtime(xtime(a0 ^ a2));
      const v = xtime(xtime(a1 ^ a3));
      state[c]     ^= u;
      state[c + 1] ^= v;
      state[c + 2] ^= u;
      state[c + 3] ^= v;
    }
  }

  function shiftRows(state) {
    // state 是 16 字节的列主序 buffer
    // row 1: shift left 1
    let t = state[1];
    state[1] = state[5];
    state[5] = state[9];
    state[9] = state[13];
    state[13] = t;
    // row 2: shift left 2
    t = state[2]; state[2] = state[10]; state[10] = t;
    t = state[6]; state[6] = state[14]; state[14] = t;
    // row 3: shift left 3
    t = state[15];
    state[15] = state[11];
    state[11] = state[7];
    state[7] = state[3];
    state[3] = t;
  }

  function invShiftRows(state) {
    let t = state[13];
    state[13] = state[9];
    state[9] = state[5];
    state[5] = state[1];
    state[1] = t;
    t = state[2]; state[2] = state[10]; state[10] = t;
    t = state[6]; state[6] = state[14]; state[14] = t;
    t = state[3];
    state[3] = state[7];
    state[7] = state[11];
    state[11] = state[15];
    state[15] = t;
  }

  function subBytes(state) {
    for (let i = 0; i < 16; i++) state[i] = SBOX[state[i]];
  }

  function invSubBytes(state) {
    const INV_SBOX = new Uint8Array(256);
    for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
    for (let i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]];
  }

  function addRoundKey(state, w, round) {
    for (let c = 0; c < 4; c++) {
      const word = w[round * 4 + c];
      state[c * 4]     ^= (word >>> 24) & 0xff;
      state[c * 4 + 1] ^= (word >>> 16) & 0xff;
      state[c * 4 + 2] ^= (word >>> 8) & 0xff;
      state[c * 4 + 3] ^= word & 0xff;
    }
  }

  function aesEncryptBlock(input, expandedKey) {
    // input/output: 16 字节
    const state = new Uint8Array(input);
    const Nr = 14;
    addRoundKey(state, expandedKey, 0);
    for (let round = 1; round < Nr; round++) {
      subBytes(state);
      shiftRows(state);
      mixColumns(state);
      addRoundKey(state, expandedKey, round);
    }
    subBytes(state);
    shiftRows(state);
    addRoundKey(state, expandedKey, Nr);
    return state;
  }

  function aesDecryptBlock(input, expandedKey) {
    const state = new Uint8Array(input);
    const Nr = 14;
    addRoundKey(state, expandedKey, Nr);
    for (let round = Nr - 1; round >= 1; round--) {
      invShiftRows(state);
      invSubBytes(state);
      addRoundKey(state, expandedKey, round);
      invMixColumns(state);
    }
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, expandedKey, 0);
    return state;
  }

  // ============================================================
  // AES-256-GCM 模式实现
  // ============================================================

  function inc32(counter) {
    // GCM 计数器只递增低 32 位
    const view = new DataView(counter.buffer, counter.byteOffset, counter.length);
    const lo = view.getUint32(12, false);
    view.setUint32(12, (lo + 1) >>> 0, false);
  }

  function gctr(key, expandedKey, icb, data) {
    // CTR 模式加密/解密（加密和解密是同一操作）
    if (data.length === 0) return new Uint8Array(0);
    const out = new Uint8Array(data.length);
    const counter = new Uint8Array(icb);
    let offset = 0;
    // 加密第一块前先计算 keystream
    let block = aesEncryptBlock(counter, expandedKey);
    while (offset < data.length) {
      const n = Math.min(16, data.length - offset);
      for (let i = 0; i < n; i++) {
        out[offset + i] = data[offset + i] ^ block[i];
      }
      offset += n;
      if (offset < data.length) {
        inc32(counter);
        block = aesEncryptBlock(counter, expandedKey);
      }
    }
    return out;
  }

  function gfMul(x, y) {
    // GHASH 中的 GF(2^128) 乘法（GCM 标准，SP 800-38D 5.2.2）
    // V 在大端字节序下，MSB（V[0] 的 bit 7）= i=0，LSB（V[15] 的 bit 0）= i=127
    // V 右移，LSB（V[15] bit 0）移出，MSB 填 0
    // 不可约多项式 x^128 + x^7 + x^2 + x + 1，反射位 R = 0xe1 (V[0])
    let z = new Uint8Array(16);
    let v = new Uint8Array(y);
    for (let i = 0; i < 128; i++) {
      // 取 x 的第 i 位（GCM 标准：i=0 → V[0] bit 7 即 MSB）
      if ((x[i >>> 3] >>> (7 - (i & 7))) & 1) {
        for (let j = 0; j < 16; j++) z[j] ^= v[j];
      }
      // V 右移
      const lsb = v[15] & 1;
      for (let j = 15; j > 0; j--) {
        v[j] = (v[j] >>> 1) | ((v[j - 1] & 1) << 7);
      }
      v[0] >>>= 1;
      if (lsb) v[0] ^= 0xe1;
    }
    return z;
  }

  function ghash(h, aad, ciphertext) {
    // 处理 AAD
    let aadPadded = aad;
    const aadPad = (16 - (aad.length % 16)) % 16;
    if (aadPad > 0 || aad.length === 0) {
      aadPadded = concat(aad, new Uint8Array(aadPad));
    } else {
      aadPadded = aad;
    }
    // 处理 ciphertext
    const ctPad = (16 - (ciphertext.length % 16)) % 16;
    let ctPadded;
    if (ctPad > 0 || ciphertext.length === 0) {
      ctPadded = concat(ciphertext, new Uint8Array(ctPad));
    } else {
      ctPadded = ciphertext;
    }
    const total = aadPadded.length + ctPadded.length;
    const blocks = new Uint8Array(total + 16);
    blocks.set(aadPadded, 0);
    blocks.set(ctPadded, aadPadded.length);
    // 长度块（位长度，64 位 × 2，大端）
    //   [len(A) in bits]_64 || [len(C) in bits]_64
    // GCM 标准要求用**位长度**，不是字节长度
    const aadBits = BigInt(aad.length) * 8n;
    const ctBits = BigInt(ciphertext.length) * 8n;
    const view = new DataView(blocks.buffer);
    view.setBigUint64(total, aadBits, false);
    view.setBigUint64(total + 8, ctBits, false);

    let y = new Uint8Array(16);
    for (let i = 0; i < blocks.length; i += 16) {
      const block = blocks.subarray(i, i + 16);
      const xored = xorBytes(y, block);
      y = gfMul(xored, h);
    }
    return y;
  }

  function aesGcmEncrypt(keyBytes, iv, plaintext, aad) {
    // keyBytes: 32 字节, iv: 12 字节, plaintext/aad: Uint8Array
    if (keyBytes.length !== 32) throw new Error('AES-256 需要 32 字节密钥');
    if (iv.length !== 12) throw new Error('GCM 需要 12 字节 IV');
    aad = aad || new Uint8Array(0);

    const expandedKey = keyExpansion(keyBytes);

    // H = AES_K(0^128)
    const h = aesEncryptBlock(new Uint8Array(16), expandedKey);
    // J0 = IV || 0x00000001
    const j0 = new Uint8Array(16);
    j0.set(iv, 0);
    j0[15] = 1;

    // C = GCTR_K(inc32(J0), P)
    const counter = new Uint8Array(j0);
    inc32(counter);
    const ciphertext = gctr(keyBytes, expandedKey, counter, plaintext);

    // S = GHASH_H(A || pad(A) || C || pad(C) || [len(A)] || [len(C)])
    const s = ghash(h, aad, ciphertext);
    // T = MSB_t(GCTR_K(J0, S))
    const tag = gctr(keyBytes, expandedKey, j0, s);
    return { ciphertext, tag: tag.subarray(0, 16) };
  }

  function aesGcmDecrypt(keyBytes, iv, ciphertext, tag, aad) {
    if (keyBytes.length !== 32) throw new Error('AES-256 需要 32 字节密钥');
    if (iv.length !== 12) throw new Error('GCM 需要 12 字节 IV');
    if (tag.length !== 16) throw new Error('GCM 标签必须是 16 字节');
    aad = aad || new Uint8Array(0);

    const expandedKey = keyExpansion(keyBytes);
    const h = aesEncryptBlock(new Uint8Array(16), expandedKey);
    const j0 = new Uint8Array(16);
    j0.set(iv, 0);
    j0[15] = 1;

    const s = ghash(h, aad, ciphertext);
    const computedTag = gctr(keyBytes, expandedKey, j0, s).subarray(0, 16);

    // 常时比较
    let diff = 0;
    for (let i = 0; i < 16; i++) diff |= tag[i] ^ computedTag[i];
    if (diff !== 0) {
      throw new Error('GCM 认证失败：密码错误或密文被篡改');
    }

    const counter = new Uint8Array(j0);
    inc32(counter);
    const plaintext = gctr(keyBytes, expandedKey, counter, ciphertext);
    return plaintext;
  }

  // ============================================================
  // 提供与原生 SubtleCrypto 子集兼容的 API
  // ============================================================

  /**
   * 模拟 subtle.importKey
   * 仅支持 PBKDF2 派生（与原代码用法一致）
   * 返回一个伪 CryptoKey 对象（仅保存原始 keyData）
   */
  function importKey(format, keyData, algo, extractable, keyUsages) {
    if (format !== 'raw') throw new Error('fallback 仅支持 raw 格式');
    if (algo !== 'PBKDF2') throw new Error('fallback 仅支持 PBKDF2 算法');
    return Promise.resolve({
      __fallback: true,
      type: 'secret',
      algorithm: { name: 'PBKDF2' },
      extractable: !!extractable,
      usages: keyUsages,
      _data: keyData instanceof ArrayBuffer ? new Uint8Array(keyData) : keyData
    });
  }

  /**
   * 模拟 subtle.deriveKey
   * 仅支持 PBKDF2 -> AES-GCM
   */
  function deriveKey(deriveAlgo, baseKey, derivedKeyAlgo, extractable, keyUsages) {
    if (deriveAlgo.name !== 'PBKDF2') throw new Error('fallback 仅支持 PBKDF2');
    if (derivedKeyAlgo.name !== 'AES-GCM') throw new Error('fallback 仅支持 AES-GCM 派生');
    if (!baseKey.__fallback) {
      return Promise.reject(new Error('fallback 仅支持内部 importKey 产生的密钥'));
    }
    const salt = deriveAlgo.salt;
    const iterations = deriveAlgo.iterations;
    const dkLen = (derivedKeyAlgo.length || 256) / 8;
    const derived = pbkdf2(baseKey._data, salt instanceof ArrayBuffer ? new Uint8Array(salt) : salt, iterations, dkLen);
    return Promise.resolve({
      __fallback: true,
      type: 'secret',
      algorithm: { name: derivedKeyAlgo.name, length: derivedKeyAlgo.length || 256 },
      extractable: !!extractable,
      usages: keyUsages,
      _data: derived
    });
  }

  /**
   * 模拟 subtle.encrypt（AES-GCM）
   * 返回 ArrayBuffer 格式：ciphertext + tag
   */
  function encrypt(algo, key, data) {
    if (algo.name !== 'AES-GCM') throw new Error('fallback 仅支持 AES-GCM 加密');
    if (!key.__fallback) return Promise.reject(new Error('fallback 仅支持内部 deriveKey 产生的密钥'));
    const iv = algo.iv;
    const ivBytes = iv instanceof ArrayBuffer ? new Uint8Array(iv) : iv;
    const dataBytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const result = aesGcmEncrypt(key._data, ivBytes, dataBytes, new Uint8Array(0));
    // 拼接 ciphertext + tag
    const out = new Uint8Array(result.ciphertext.length + result.tag.length);
    out.set(result.ciphertext, 0);
    out.set(result.tag, result.ciphertext.length);
    return Promise.resolve(out.buffer);
  }

  /**
   * 模拟 subtle.decrypt（AES-GCM）
   * 输入 data 包含 ciphertext + tag
   */
  function decrypt(algo, key, data) {
    if (algo.name !== 'AES-GCM') throw new Error('fallback 仅支持 AES-GCM 解密');
    if (!key.__fallback) return Promise.reject(new Error('fallback 仅支持内部 deriveKey 产生的密钥'));
    const iv = algo.iv;
    const ivBytes = iv instanceof ArrayBuffer ? new Uint8Array(iv) : iv;
    const dataBytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    if (dataBytes.length < 16) throw new Error('密文长度不足，无法包含 GCM 标签');
    const ciphertext = dataBytes.subarray(0, dataBytes.length - 16);
    const tag = dataBytes.subarray(dataBytes.length - 16);
    const plaintext = aesGcmDecrypt(key._data, ivBytes, ciphertext, tag, new Uint8Array(0));
    return Promise.resolve(plaintext.buffer);
  }

  const subtleFallback = {
    importKey,
    deriveKey,
    encrypt,
    decrypt
  };

  function isAvailable() {
    return !!(typeof crypto !== 'undefined' && crypto && crypto.subtle);
  }

  global.WebCryptoFallback = {
    subtle: subtleFallback,
    isAvailable
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ES Module 导出（仅当作为 ES module 加载时有效）
// 浏览器中通过 <script type="module"> 加载时，会触发 export
// 包裹在 try-catch 中避免在非 ES module 环境下出错
try {
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined' && module.exports) {
    // Node CommonJS 环境下不导出（仅全局）
  } else {
    // 浏览器 ES Module 环境
    // 通过 import { WebCryptoFallback } from '...' 即可获取
  }
} catch (e) { /* ignore */ }
