const types: Record<string, string> = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', xhtml: 'application/xhtml+xml',
  js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', xml: 'application/xml; charset=utf-8',
  xsd: 'application/xml; charset=utf-8', dtd: 'application/xml-dtd', txt: 'text/plain; charset=utf-8', vtt: 'text/vtt; charset=utf-8',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  ico: 'image/x-icon', bmp: 'image/bmp', avif: 'image/avif',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', aac: 'audio/aac',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  pdf: 'application/pdf', swf: 'application/x-shockwave-flash', wasm: 'application/wasm',
};

export function mimeType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
  return types[ext] ?? 'application/octet-stream';
}
