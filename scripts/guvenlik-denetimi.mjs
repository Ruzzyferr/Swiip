/**
 * Bağımlılık güvenlik kapısı.
 *
 * `npm audit --audit-level=high` düz hâliyle iki sorunu birden yaratıyor:
 * ya kırmızı kalıyor ve kimse bakmıyor, ya da eşik düşürülüyor ve gerçek açık kaçıyor.
 *
 * Buradaki kural: **düzeltilebilir her yüksek/kritik açık işi durdurur.** Yalnızca
 * aşağıda gerekçesiyle yazılı olanlar geçer, onlar da gözden geçirme tarihiyle birlikte.
 * Tarih geçerse betik yine kırmızıya döner — süresiz muafiyet yoktur.
 *
 * Kullanım: node scripts/guvenlik-denetimi.mjs
 */
import { execSync } from 'node:child_process';

/**
 * Bilinen ve şimdilik kabul edilen açıklar.
 *
 * Hepsinin ortak özelliği: **kullanıcının cihazına giden kodda değil**, Expo/Metro
 * derleme zincirinde. Bunları düzeltmek Expo SDK'sını yükseltmek demek — platform
 * kararı, ayrı bir iş ve ayrı bir doğrulama gerektiriyor.
 */
const MUAFIYETLER = [
  {
    paket: '@xmldom/xmldom',
    neden: '@expo/plist üzerinden geliyor; yalnızca derleme sırasında plist yazarken kullanılıyor.',
    gozdenGecir: '2026-11-01',
  },
  {
    paket: 'image-size',
    neden: 'metro paketleyicisinin bağımlılığı; yayınlanan uygulamada çalışmıyor.',
    gozdenGecir: '2026-11-01',
  },
  {
    paket: 'postcss',
    neden: '@expo/metro-config ve vitest üzerinden geliyor; ikisi de derleme/test zamanı.',
    gozdenGecir: '2026-11-01',
  },
  {
    paket: 'tar',
    neden: '@expo/cli önbelleği açarken kullanıyor; sunucuda veya uygulamada yok.',
    gozdenGecir: '2026-11-01',
  },
];

const CIDDI = new Set(['high', 'critical']);

/**
 * Komut sabit bir dize: dışarıdan gelen hiçbir girdi buraya karışmıyor.
 *
 * `execFileSync` ile ayrı argüman geçmek daha güvenli olurdu ama Windows'ta npm bir
 * `.cmd` sarmalayıcı ve Node 24 bunu kabuksuz çalıştırmayı engelliyor.
 */
function auditCalistir() {
  try {
    return JSON.parse(execSync('npm audit --json', { encoding: 'utf8', maxBuffer: 32e6 }));
  } catch (hata) {
    // npm audit açık bulunca sıfırdan farklı kod döner; çıktı yine JSON.
    if (hata.stdout) return JSON.parse(hata.stdout);
    throw hata;
  }
}

const rapor = auditCalistir();

/**
 * npm audit hem açığın kaynağını hem de ona bağlı her paketi listeler.
 *
 * Kaynak paketlerde `via` içinde tavsiye nesnesi bulunur; yalnızca bağımlı olanlarda
 * `via` sadece başka paket adlarından oluşur. Bağımlıları da raporlamak listeyi üçe
 * katlıyor ve asıl düzeltilecek paketi gizliyor.
 */
function kaynakMi(aciklik) {
  return (aciklik.via ?? []).some((v) => typeof v === 'object');
}

const acikliklar = Object.values(rapor.vulnerabilities ?? {})
  .filter((a) => CIDDI.has(a.severity))
  .filter(kaynakMi);

const bugun = new Date().toISOString().slice(0, 10);
const muafiyetSozlugu = new Map(MUAFIYETLER.map((m) => [m.paket, m]));

const suresiGecen = MUAFIYETLER.filter((m) => m.gozdenGecir < bugun);
const kapiyiGecemeyen = acikliklar.filter((a) => !muafiyetSozlugu.has(a.name));

if (suresiGecen.length > 0) {
  console.error('Süresi dolmuş muafiyetler var; yeniden değerlendirilmeli:\n');
  for (const m of suresiGecen) console.error(`  ${m.paket} — son tarih ${m.gozdenGecir}`);
  console.error('');
}

if (kapiyiGecemeyen.length > 0) {
  console.error(`Muafiyeti olmayan ${kapiyiGecemeyen.length} yüksek/kritik açık var:\n`);
  for (const a of kapiyiGecemeyen) {
    console.error(`  ${a.name} (${a.severity}) — ${a.range}`);
  }
  console.error('\nYa bağımlılığı yükselt ya da gerekçesiyle scripts/guvenlik-denetimi.mjs');
  console.error('içindeki MUAFIYETLER listesine ekle. Gerekçesiz muafiyet yazma.');
}

if (kapiyiGecemeyen.length > 0 || suresiGecen.length > 0) process.exit(1);

const kullanilan = acikliklar.map((a) => a.name);
console.log(
  `Güvenlik denetimi temiz. ${kullanilan.length} açık gerekçeli muafiyette: ` +
    `${kullanilan.join(', ') || 'yok'}.`,
);
