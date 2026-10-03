#!/usr/bin/env bash
#
# Sunucuya dağıtır.
#
# Neden var: dağıtım hiçbir yerde yazılı değildi. İlk kurulum elle bir tarball
# atılarak yapılmış, sunucudaki `/opt/swiip` bir git deposu bile değil. Bu yüzden
# "acaba sunucudaki kod hangi commit?" sorusunun cevabı yoktu. Artık her dağıtım
# commit'i sunucuya yazıyor (`/opt/swiip/SURUM`) ve karşılaştırılabiliyor.
#
# Kaynak `git archive` ile üretiliyor: çalışma kopyasındaki kirli dosyalar,
# `node_modules` ve `.env` kazara gitmesin. Sunucudaki `infra/.env` ÜRETİM SIRLARINI
# tutuyor ve bu betik ona hiç dokunmuyor.
#
#   scripts/sunucu-dagit.sh [kullanici@sunucu]
#
set -euo pipefail

HEDEF="${1:-root@157.230.118.230}"
UZAK_DIZIN=/opt/swiip
KOK="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KOK"

# Kirli çalışma kopyasıyla dağıtmak, sunucuda hangi kodun döndüğünü bilinmez yapar.
if [ -n "$(git status --porcelain)" ]; then
  echo "HATA: çalışma kopyası temiz değil. Önce commit'le." >&2
  git status --short >&2
  exit 1
fi

SURUM="$(git rev-parse HEAD)"
KISA="$(git rev-parse --short HEAD)"
# Paket bir geçici dosyaya yazılıyor ama `git archive -o` ile DEĞİL, kabuk
# yönlendirmesiyle. Git Bash'te `mktemp -d` bir MSYS yolu (/tmp/...) üretiyor ve
# Windows `git.exe` o yola `-o` ile yazamıyordu; çözüm diye her seferinde TMPDIR
# elle ayarlanıyordu. Yönlendirmeyi kabuğun kendisi açtığı için yol her iki
# dünyada da geçerli. Yükleme de `scp` yerine ssh'in standart girdisinden
# yapılıyor: `scp "C:/..."` iki nokta üst üsteden önceki kısmı ana makine adı sanıyor.
GECICI="$(mktemp -d)"
trap 'rm -rf "$GECICI"' EXIT
PAKET="$GECICI/swiip.tar.gz"

# `apps/site` GONDERILIYOR — Caddy marka sitesini oradan sunuyor.
#
# Burada yalnizca `infra magaza packages scripts` vardi ve yorumu "apps/ gonderilmiyor:
# mobil uygulama sunucuda derlenmiyor" diyordu. Dogru ama eksik: `docker-compose.yml`
# Caddy'ye `../apps/site:/site:ro` bagliyor, yani site sunucudaki o klasorden servis
# ediliyor. Sonuc: site dosyalari HICBIR dagitimda guncellenmiyordu.
#
# 2026-08-26'da olculdu — sunucudaki kopya ilk kurulumdan (21 Agustos) kalmisti ve
# dort dosyadan ucunun md5'i depodakinden farkliydi:
#
#   index.html        c94507a3880f  (depoda f83ed83b239d)
#   gizlilik.html     c779f036bd37  (depoda 5f02f37c21d3)
#   hesap-silme.html  e98099376df6  (depoda 5da250fa3f67)
#
# Yani canlidaki gizlilik politikasi ve hesap silme sayfasi depodakiyle ayni degildi —
# ve bu ikisi magaza incelemesinde tiklanan baglantilar. Kusur sessizdi: dagitim
# "basarili" yaziyor, saglik ucu 200 donuyor, site aciliyor; yalnizca icerigi eski.
#
# `apps/mobile` hala gonderilmiyor: sunucuda derlenmiyor ve bosuna yer kaplar.
# `yedekler/` sunucunun kendi urettigi klasor, dokunulmuyor.
git archive --format=tar.gz HEAD >"$PAKET" \
  infra magaza packages scripts apps/site \
  package.json package-lock.json tsconfig.base.json tsconfig.json vitest.config.ts

echo "  paket: $(du -h "$PAKET" | cut -f1) · sürüm $KISA"

ssh "$HEDEF" 'cat > /tmp/swiip.tar.gz' <"$PAKET"

# Uzak betik TIRNAKLI heredoc (<<'UZAK'): içindeki hiçbir şey YERELDE genişlemiyor.
#
# Tırnaksızdı ve aşağıdaki yorumlardaki ters tırnaklı ifadeler (tar -xzf, up -d,
# caddy reload, infra/Caddyfile ...) dağıtımı yapan makinede KOMUT olarak
# çalıştırılıyordu: heredoc genişlemesi kabuk yorumunu tanımaz. Gereken iki değer
# ssh komut satırından veriliyor.
ssh "$HEDEF" "SURUM='$SURUM' UZAK_DIZIN='$UZAK_DIZIN' bash -s" <<'UZAK'
set -euo pipefail
cd "$UZAK_DIZIN"

# .env'i koru: tarball'da yok ama açma sırasında bir kaza olmasın diye yedekliyoruz.
cp infra/.env /tmp/.env.koruma

tar -xzf /tmp/swiip.tar.gz -C "$UZAK_DIZIN"
cp /tmp/.env.koruma infra/.env
rm -f /tmp/swiip.tar.gz /tmp/.env.koruma

# TUM servisler derleniyor, yalnizca api degil.
#
# Burada 'build api' yaziyordu. gocmen ve tohumcu ayni Dockerfile'i kullaniyor ama
# ayri servisler, yani ayri imajlari var: api her dagitimda yeniden derlenirken
# otekiler ilk derlendikleri halde kaliyordu. gocmen goc dosyalarini IMAJDAN okuduugu
# icin sonuc suydu: o imaj derlendikten sonra eklenen hicbir goc veritabanina
# uygulanmadi.
#
# Sessiz oldugu icin fark edilmiyordu: gocmen basariyla cikiyor (uygulayacak yeni
# dosya gormuyor), api ayaga kalkiyor, saglik ucu 200 donuyor. Kusur ancak yeni tablo
# ilk kez sorgulandiginda 500 olarak goruunuyor. Uretimde tam bu oldu: kanca_olaylari
# tablosu yoktu ve abonelik kancasi 42P01 ile patliyordu.
docker compose -f infra/docker-compose.yml build
docker compose -f infra/docker-compose.yml up -d

# Caddy ZORLA yeniden olusturuluyor.
#
# `Caddyfile` konteynere TEK DOSYA olarak baglaniyor
# (`./Caddyfile:/etc/caddy/Caddyfile:ro`) ve Docker tek dosya baglantisini inode'a
# bagliyor. `tar -xzf` dosyayi yerinde degistirmiyor: siliyor ve yenisini
# olusturuyor, yani yeni inode. Konteyner eski inode'u tutmaya devam ediyor.
#
# `up -d` de yardim etmiyor: compose dosyasi degismedigi icin caddy'yi "Running"
# birakiyor. Sonuc: Caddyfile'daki hicbir degisiklik dagitimla etkili olmuyordu.
#
# 2026-08-26'da olculdu. Site yonlendirmesi duzeltildi, dagitildi, sunucudaki
# `infra/Caddyfile` guncelken konteynerdeki dosyada `handle_errors` sayisi HALA 0'di
# ve yanlis yollar 200 ile ana sayfayi donduruyordu. `caddy reload` da yetmedi --
# okudugu dosyanin kendisi eskiydi.
#
# Ayni sinif kusur: bir sey yapildigi saniliyor, hicbir sey uyarmiyor.
#
# `yedekleyici` da AYNI sebeple burada: `scripts/yedek-al.sh` ona tek dosya olarak
# bağlanıyor. Yeniden oluşturulmadan yedek betiğindeki hiçbir değişiklik gece işine
# ulaşmıyordu.
docker compose -f infra/docker-compose.yml up -d --force-recreate caddy yedekleyici

# SURUM en sonda yazılıyor. Önce yazılıyordu ve derleme yarıda kaldığında dosya yeni
# commit'i gösterirken konteynerde hâlâ eski kod dönüyordu — "hangi kod dönüyor?"
# sorusunun tek cevabı olan dosya yalan söylüyordu. Derleme düşerse eski değer kalır.
echo "$SURUM" > "$UZAK_DIZIN/SURUM"
UZAK

echo "  sağlık bekleniyor..."
for _ in $(seq 1 30); do
  KOD="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://swiip.app/saglik || true)"
  if [ "$KOD" = "200" ]; then
    echo "  sunucu ayakta · sürüm $KISA"
    exit 0
  fi
  sleep 4
done

echo "HATA: sağlık ucu 200 dönmedi." >&2
exit 1
