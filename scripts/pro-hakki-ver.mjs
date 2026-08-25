/**
 * Bir hesaba elle Pro (ya da Temel) hakkı verir — yalnızca İÇ TEST hesapları için.
 *
 * Neden ayrı bir betik: hak vermek `subscriptions` defterine yazmak demek ve o defter
 * normalde **yalnızca RevenueCat kancasıyla** doluyor. Elle yazmak bilinçli bir
 * istisna; hesap kurma akışının içine gömülseydi, bir gün birinin farkında olmadan
 * gerçek bir kullanıcıya bedava Pro vermesi işten olmazdı.
 *
 * `platform` bilerek `manuel`: defterde hangi satırın gerçek satın almadan, hangisinin
 * elden geldiği ayırt edilebilsin. Gerçek bir kanca gelirse bu satırın üstüne yazar ve
 * doğrusu da budur.
 *
 *   node scripts/pro-hakki-ver.mjs <eposta> [pro|temel] [yil]
 *   node scripts/pro-hakki-ver.mjs <eposta> kaldir
 *
 * Sunucuya SSH ile bağlanıyor; erişim bilgileri depoda değil.
 */
import { execFileSync } from 'node:child_process';

const SUNUCU = process.env.SWIIP_SUNUCU ?? 'root@157.230.118.230';
const [eposta, komut = 'pro', yilArg] = process.argv.slice(2);

if (!eposta) {
  console.error('kullanım: pro-hakki-ver.mjs <eposta> [pro|temel|kaldir] [yil]');
  process.exit(2);
}

const URUN = { pro: 'swiip_pro_yillik', temel: 'swiip_temel_yillik' };
if (komut !== 'kaldir' && !URUN[komut]) {
  console.error(`plan "${komut}" yok. pro | temel | kaldir`);
  process.exit(2);
}

/** Tek tırnak SQL'e kaçırılıyor; e-posta dışarıdan geliyor. */
const q = (m) => String(m).replace(/'/g, "''");

const psql = (sql) =>
  execFileSync(
    'ssh',
    [
      '-o',
      'ConnectTimeout=10',
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=no',
      SUNUCU,
      `docker exec swiip-postgres-1 psql -U swiip -d swiip -tAc "${sql.replace(/"/g, '\\"')}"`,
    ],
    { encoding: 'utf8' },
  ).trim();

const kullaniciId = psql(`select id from users where lower(email)=lower('${q(eposta)}')`);
if (!kullaniciId) {
  console.error(`"${eposta}" adresiyle bir hesap yok. Önce uygulamada kayıt ol.`);
  process.exit(1);
}

if (komut === 'kaldir') {
  psql(`delete from subscriptions where user_id='${q(kullaniciId)}'`);
  const kalan = psql(`select count(*) from subscriptions where user_id='${q(kullaniciId)}'`);
  console.log(kalan === '0' ? 'hak kaldırıldı.' : `BAŞARISIZ: ${kalan} satır kaldı`);
  process.exit(kalan === '0' ? 0 : 1);
}

const yil = Number(yilArg ?? 2);
const bitis = new Date();
bitis.setUTCFullYear(bitis.getUTCFullYear() + yil);
const bitisMetni = bitis.toISOString();

psql(`
  insert into subscriptions (user_id, plan, product_id, status, renews_at, platform, updated_at)
  values ('${q(kullaniciId)}', '${komut}', '${URUN[komut]}', 'aktif', '${bitisMetni}', 'manuel', now())
  on conflict (user_id) do update set
    plan = excluded.plan,
    product_id = excluded.product_id,
    status = excluded.status,
    renews_at = excluded.renews_at,
    platform = excluded.platform,
    updated_at = now()
`);

// Geri okuma: yazdım demekle uygulamanın gördüğü şey ayrı.
const sonra = psql(`
  select plan||' | '||status||' | '||platform||' | '||renews_at::date
  from subscriptions where user_id='${q(kullaniciId)}'
`);
console.log(`${eposta} -> ${sonra}`);
if (!sonra.startsWith(komut)) {
  console.error('DOĞRULAMA BAŞARISIZ: defter beklenen planı tutmuyor.');
  process.exit(1);
}
console.log('doğrulandı.');
