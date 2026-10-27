// tgcloud/endpoints/pack.js — создание стикерпака / эмодзи-пака из Mini App (Telegram Serverless).
// Токен бота не нужен: api.* работает от имени бота, а ctx.initData.user проверен платформой.
import { api, InputFile, EndpointError } from 'sdk';

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function fromB64(s) {
  s = String(s || '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0, buf = 0, bits = 0;
  for (let i = 0; i < s.length; i++) {
    buf = (buf << 6) | A.indexOf(s[i]); bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 255; }
  }
  return out.subarray(0, o);
}
const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^[^a-z]+/, '').replace(/_$/, '').slice(0, 40);

export default async function (input, ctx) {
  const user = ctx.initData.user;
  if (!user || !input || !input.data) throw new EndpointError('Нет данных');
  const bytes = fromB64(input.data);
  if (!bytes.length || bytes.length > 65536) throw new EndpointError('Стикер больше 64 КБ или пустой');
  const emoji = String(input.emoji || '✨').trim() || '✨';
  const mk = () => ({ sticker: new InputFile(bytes, 's.tgs', { type: 'application/x-tgsticker' }), format: 'animated', emoji_list: [emoji] });
  try {
    if (input.op === 'start') {
      const me = await api.getMe();
      const suffix = '_by_' + me.username;
      let base = clean(input.name) || 'pack' + Math.random().toString(36).slice(2, 8);
      const name = base.slice(0, 64 - suffix.length) + suffix;
      const type = input.type === 'emoji' ? 'custom_emoji' : 'regular';
      await api.createNewStickerSet({ user_id: user.id, name, title: String(input.title || 'Пак').slice(0, 64), sticker_type: type, stickers: [mk()] });
      return { name, link: (type === 'custom_emoji' ? 'https://t.me/addemoji/' : 'https://t.me/addstickers/') + name };
    }
    if (input.op === 'add') {
      await api.addStickerToSet({ user_id: user.id, name: String(input.name), sticker: mk() });
      return { ok: true };
    }
  } catch (e) {
    throw new EndpointError(String((e && e.message) || e));
  }
  throw new EndpointError('Неизвестная операция');
}
