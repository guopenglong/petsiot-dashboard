/**
 * Cloudflare Pages Functions — API Proxy
 * 所有请求都在 Worker 端完成签名，浏览器不持有密钥
 *
 * 路由：/api/*  → 代理到 publiciot.net 各端点
 */

// ─── MD5 (纯 JS，无需依赖) ─────────────────────────────────────────────────
function md5(str) {
  function safeAdd(x, y) { const lsw = (x & 0xffff) + (y & 0xffff); const msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xffff); }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    return md5blks;
  }
  const hex = '0123456789abcdef';
  function rhex(n) { let s = ''; for (let j = 0; j < 4; j++) s += hex.charAt((n >> (j * 8 + 4)) & 0x0f) + hex.charAt((n >> (j * 8)) & 0x0f); return s; }
  function str2rstr_UTF8(input) { return unescape(encodeURIComponent(input)); }
  function rstr2binl(input) {
    const output = Array(input.length >> 2).fill(0);
    for (let i = 0; i < input.length * 8; i += 8) output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
    return output;
  }
  function binl2rstr(input) {
    let output = '';
    for (let i = 0; i < input.length * 32; i += 8) output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
    return output;
  }
  function binlMD5(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const [olda, oldb, oldc, oldd] = [a, b, c, d];
      a = md5ff(a,b,c,d,x[i],7,-680876936);d=md5ff(d,a,b,c,x[i+1],12,-389564586);c=md5ff(c,d,a,b,x[i+2],17,606105819);b=md5ff(b,c,d,a,x[i+3],22,-1044525330);
      a=md5ff(a,b,c,d,x[i+4],7,-176418897);d=md5ff(d,a,b,c,x[i+5],12,1200080426);c=md5ff(c,d,a,b,x[i+6],17,-1473231341);b=md5ff(b,c,d,a,x[i+7],22,-45705983);
      a=md5ff(a,b,c,d,x[i+8],7,1770035416);d=md5ff(d,a,b,c,x[i+9],12,-1958414417);c=md5ff(c,d,a,b,x[i+10],17,-42063);b=md5ff(b,c,d,a,x[i+11],22,-1990404162);
      a=md5ff(a,b,c,d,x[i+12],7,1804603682);d=md5ff(d,a,b,c,x[i+13],12,-40341101);c=md5ff(c,d,a,b,x[i+14],17,-1502002290);b=md5ff(b,c,d,a,x[i+15],22,1236535329);
      a=md5gg(a,b,c,d,x[i+1],5,-165796510);d=md5gg(d,a,b,c,x[i+6],9,-1069501632);c=md5gg(c,d,a,b,x[i+11],14,643717713);b=md5gg(b,c,d,a,x[i],20,-373897302);
      a=md5gg(a,b,c,d,x[i+5],5,-701558691);d=md5gg(d,a,b,c,x[i+10],9,38016083);c=md5gg(c,d,a,b,x[i+15],14,-660478335);b=md5gg(b,c,d,a,x[i+4],20,-405537848);
      a=md5gg(a,b,c,d,x[i+9],5,568446438);d=md5gg(d,a,b,c,x[i+14],9,-1019803690);c=md5gg(c,d,a,b,x[i+3],14,-187363961);b=md5gg(b,c,d,a,x[i+8],20,1163531501);
      a=md5gg(a,b,c,d,x[i+13],5,-1444681467);d=md5gg(d,a,b,c,x[i+2],9,-51403784);c=md5gg(c,d,a,b,x[i+7],14,1735328473);b=md5gg(b,c,d,a,x[i+12],20,-1926607734);
      a=md5hh(a,b,c,d,x[i+5],4,-378558);d=md5hh(d,a,b,c,x[i+8],11,-2022574463);c=md5hh(c,d,a,b,x[i+11],16,1839030562);b=md5hh(b,c,d,a,x[i+14],23,-35309556);
      a=md5hh(a,b,c,d,x[i+1],4,-1530992060);d=md5hh(d,a,b,c,x[i+4],11,1272893353);c=md5hh(c,d,a,b,x[i+7],16,-155497632);b=md5hh(b,c,d,a,x[i+10],23,-1094730640);
      a=md5hh(a,b,c,d,x[i+13],4,681279174);d=md5hh(d,a,b,c,x[i],11,-358537222);c=md5hh(c,d,a,b,x[i+3],16,-722521979);b=md5hh(b,c,d,a,x[i+6],23,76029189);
      a=md5hh(a,b,c,d,x[i+9],4,-640364487);d=md5hh(d,a,b,c,x[i+12],11,-421815835);c=md5hh(c,d,a,b,x[i+15],16,530742520);b=md5hh(b,c,d,a,x[i+2],23,-995338651);
      a=md5ii(a,b,c,d,x[i],6,-198630844);d=md5ii(d,a,b,c,x[i+7],10,1126891415);c=md5ii(c,d,a,b,x[i+14],15,-1416354905);b=md5ii(b,c,d,a,x[i+5],21,-57434055);
      a=md5ii(a,b,c,d,x[i+12],6,1700485571);d=md5ii(d,a,b,c,x[i+3],10,-1894986606);c=md5ii(c,d,a,b,x[i+10],15,-1051523);b=md5ii(b,c,d,a,x[i+1],21,-2054922799);
      a=md5ii(a,b,c,d,x[i+8],6,1873313359);d=md5ii(d,a,b,c,x[i+15],10,-30611744);c=md5ii(c,d,a,b,x[i+6],15,-1560198380);b=md5ii(b,c,d,a,x[i+13],21,1309151649);
      a=md5ii(a,b,c,d,x[i+4],6,-145523070);d=md5ii(d,a,b,c,x[i+11],10,-1120210379);c=md5ii(c,d,a,b,x[i+2],15,718787259);b=md5ii(b,c,d,a,x[i+9],21,-343485551);
      a=safeAdd(a,olda);b=safeAdd(b,oldb);c=safeAdd(c,oldc);d=safeAdd(d,oldd);
    }
    return [a, b, c, d];
  }
  const u = str2rstr_UTF8(str);
  const r = binl2rstr(binlMD5(rstr2binl(u), u.length * 8));
  let out = '';
  for (let i = 0; i < r.length; i++) out += rhex(r.charCodeAt(i));
  return out;
}

// ─── 签名生成（还原 app.js httpRequest 逻辑） ──────────────────────────────
function makeSignedUrid(url, httpMethod) {
  // unixsec：UTC 秒 + 时区偏移（服务器用北京时间 UTC+8，偏移 = -480 分钟 * 60 = -28800s）
  // 原小程序：unixsec() + 60 * o.getTimezoneOffset()
  // getTimezoneOffset() 在东八区返回 -480，所以实际 = utcSec + 60*(-480) = utcSec - 28800
  const utcSec = Math.floor(Date.now() / 1000);
  const ts = utcSec + 60 * (-480); // 固定东八区，与服务器保持一致
  const step1 = md5(url + httpMethod + 'publiciot');
  const signed = md5(url + httpMethod + ts + step1);
  return signed + ts;
}

// ─── 设备类型路由 ──────────────────────────────────────────────────────────
const THING_URLS = {
  u10: 'https://thing.publiciot.net',
  u20: 'https://u20thing.publiciot.net',
  u30: 'https://u30thing.publiciot.net',
  u31: 'https://u31thing.publiciot.net',
};

const API_URL = 'https://miniapp.publiciot.net';
const DATA_URL = 'https://miniapp.publiciot.net:6443';

// ─── 通用代理请求 ──────────────────────────────────────────────────────────
async function proxyRequest(targetUrl, body) {
  const signedUrid = makeSignedUrid(targetUrl, 'POST');
  const resp = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'mini-app': 'openai',
      'signed-urid': signedUrid,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

// ─── 主路由处理 ────────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }

  const url = new URL(request.url);
  // 去掉 /api 前缀，取剩余路径段
  const path = url.pathname.replace(/^\/api/, '');

  // ── GET /api/devices?userid=xxx ──────────────────────────────────────────
  if (request.method === 'GET' && path === '/devices') {
    const userid = url.searchParams.get('userid');
    if (!userid) return jsonResp({ error: 'userid required' }, 400);
    return proxyRequest(`${API_URL}/User`, { method: 21, param: { userid } });
  }

  // ── GET /api/device?userid=&thingid= ────────────────────────────────────
  if (request.method === 'GET' && path === '/device') {
    const userid = url.searchParams.get('userid');
    const thingid = url.searchParams.get('thingid');
    if (!userid || !thingid) return jsonResp({ error: 'userid and thingid required' }, 400);
    return proxyRequest(`${API_URL}/User`, { method: 11, param: { userid, thingid } });
  }

  // ── GET /api/userinfo?userid=xxx ─────────────────────────────────────────
  if (request.method === 'GET' && path === '/userinfo') {
    const userid = url.searchParams.get('userid');
    if (!userid) return jsonResp({ error: 'userid required' }, 400);
    return proxyRequest(`${API_URL}/User`, { method: 6, param: { userid } });
  }

  // ── GET /api/flowinfo?type=u10&userid=&thingid= ──────────────────────────
  if (request.method === 'GET' && path === '/flowinfo') {
    const type = (url.searchParams.get('type') || 'u10').toLowerCase();
    const userid = url.searchParams.get('userid');
    const thingid = url.searchParams.get('thingid');
    if (!userid || !thingid) return jsonResp({ error: 'userid and thingid required' }, 400);
    const typeMap = { u10: 'U10', u20: 'U20', u30: 'U30', u31: 'U31' };
    const T = typeMap[type] || 'U10';
    const targetUrl = `${DATA_URL}/${T}TodayFlowInfoList`;
    // Token 格式：MD5("Token:" + deviceId + "-" + unixSec + "-" + T + "TodayFlowInfo")
    const ts = Math.floor(Date.now() / 1000);
    const token = md5(`Token:${thingid}-${ts}-${T}TodayFlowInfo`);
    const signedUrid = makeSignedUrid(targetUrl, 'POST');
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'mini-app': 'openai', 'signed-urid': signedUrid, 'content-type': 'application/json' },
      body: JSON.stringify({ DeviceId: thingid, Token: token, Time: ts }),
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  // ── GET /api/setinfo?type=u10&thingid= ───────────────────────────────────
  if (request.method === 'GET' && path === '/setinfo') {
    const type = (url.searchParams.get('type') || 'u10').toLowerCase();
    const thingid = url.searchParams.get('thingid');
    if (!thingid) return jsonResp({ error: 'thingid required' }, 400);
    const thingUrl = THING_URLS[type] || THING_URLS.u10;
    const methodMap = { u10: 'GetU10SetInfo', u20: 'GetU20SetInfo', u30: 'GetU30SetInfo', u31: 'GetU31SetInfo' };
    const targetUrl = `${thingUrl}/GetSetInfo`;
    const signedUrid = makeSignedUrid(targetUrl, 'POST');
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'mini-app': 'openai', 'signed-urid': signedUrid, 'content-type': 'application/json' },
      body: JSON.stringify({ method: methodMap[type], param: { thingid }, timestamp: Date.now() }),
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  // ── POST /api/command ─────────────────────────────────────────────────────
  // Body: { type: "u10"|"u20"|"u30"|"u31", method: string, param: object }
  if (request.method === 'POST' && path === '/command') {
    let body;
    try { body = await request.json(); } catch { return jsonResp({ error: 'invalid json' }, 400); }
    const { type = 'u10', method: cmdMethod, param } = body;
    if (!cmdMethod || !param) return jsonResp({ error: 'method and param required' }, 400);
    const thingUrl = THING_URLS[type] || THING_URLS.u10;
    const targetUrl = `${thingUrl}/Push2Thing`;
    return proxyRequest(targetUrl, { method: cmdMethod, param, timestamp: Date.now() });
  }

  // ── POST /api/rename ──────────────────────────────────────────────────────
  // Body: { userid, deviceid, devicename }
  if (request.method === 'POST' && path === '/rename') {
    let body;
    try { body = await request.json(); } catch { return jsonResp({ error: 'invalid json' }, 400); }
    const { userid, deviceid, devicename } = body;
    if (!userid || !deviceid || !devicename) return jsonResp({ error: 'missing fields' }, 400);
    return proxyRequest(`${API_URL}/Device`, { method: 2, param: { userid, deviceid, devicename } });
  }

  return jsonResp({ error: 'not found', path }, 404);
}

