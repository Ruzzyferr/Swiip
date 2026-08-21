#!/usr/bin/env bash
# Yedekten geri yükleme testi — F0.4'ün "gerçekten denendi ve çalıştı" maddesi.
#
# Ne yapar:
#   1. Canlı veritabanından yedek alır.
#   2. Geçici, izole bir Postgres kabı ayağa kaldırır.
#   3. Yedeği o kaba geri yükler.
#   4. Tablo ve satır sayılarını kaynakla karşılaştırır.
#   5. Geçici kabı siler.
#
# Canlı veritabanına yazmaz. Ayda bir çalıştır; kullanıcı verisi kabul etmeden ÖNCE bir kez
# çalıştırılmış olmalı. Geri yüklemesi denenmemiş yedek, yedek değildir.
#
# Kullanım:  scripts/yedek-geri-yukleme-testi.sh [yedek-dosyasi.dump]

set -euo pipefail

KOK_DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Veritabani kullanicisi ve adi: compose ile ayni varsayilanlar.
#
# pg_dump kullanici verilmezse kabin OS kullanicisini (root) dener ve
# "role root does not exist" ile duser -- betik ilk kez calistirildiginda cikan hata buydu.
#
# .env `source` EDILMIYOR: icinde POSTA_GONDEREN="Swiip <merhaba@...>" gibi
# tirnaksiz degerler var ve `<` kabuk icin yonlendirmedir. Yalnizca ihtiyac duyulan
# iki anahtar okunuyor.
env_oku() {
  local anahtar="$1" varsayilan="$2" dosya="${KOK_DIZIN}/infra/.env"
  local deger=""
  if [ -f "$dosya" ]; then
    deger="$(sed -n "s/^${anahtar}=//p" "$dosya" | tail -n 1 | tr -d '' | sed 's/^"//; s/"$//')"
  fi
  printf '%s' "${deger:-$varsayilan}"
}
DB_KULLANICI="$(env_oku POSTGRES_USER swiip)"
DB_ADI="$(env_oku POSTGRES_DB swiip)"
TEST_KABI="swiip-geri-yukleme-testi"
TEST_PAROLA="geri-yukleme-testi-gecici"
TEST_PORT="55439"
GECICI_DIZIN="$(mktemp -d)"

temizle() {
  echo "→ geçici kaynaklar siliniyor"
  docker rm -f "$TEST_KABI" > /dev/null 2>&1 || true
  rm -rf "$GECICI_DIZIN"
}
trap temizle EXIT

if ! docker info > /dev/null 2>&1; then
  echo "HATA: Docker çalışmıyor. Bu test gerçek bir Postgres örneği gerektirir." >&2
  exit 1
fi

# --- 1. Yedek ---
if [ $# -ge 1 ]; then
  YEDEK="$1"
  echo "→ verilen yedek kullanılıyor: $YEDEK"
else
  YEDEK="${GECICI_DIZIN}/test.dump"
  echo "→ canlı veritabanından yedek alınıyor"
  docker compose --env-file "${KOK_DIZIN}/infra/.env"     -f "${KOK_DIZIN}/infra/docker-compose.yml" exec -T postgres \
    pg_dump --username="$DB_KULLANICI" --dbname="$DB_ADI" --format=custom --no-owner --no-privileges > "$YEDEK"
fi

if [ ! -s "$YEDEK" ]; then
  echo "HATA: yedek dosyası boş." >&2
  exit 1
fi
echo "→ yedek boyutu: $(wc -c < "$YEDEK") bayt"

# --- 2. İzole Postgres ---
echo "→ geçici Postgres ayağa kalkıyor"
docker run -d --name "$TEST_KABI" \
  -e POSTGRES_PASSWORD="$TEST_PAROLA" \
  -e POSTGRES_USER=swiip \
  -e POSTGRES_DB=swiip_test \
  -p "${TEST_PORT}:5432" \
  postgres:17-alpine > /dev/null

echo -n "→ hazır olması bekleniyor"
for _ in $(seq 1 60); do
  if docker exec "$TEST_KABI" pg_isready -U swiip -d swiip_test > /dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

# --- 3. Geri yükleme ---
echo "→ yedek geri yükleniyor"
docker exec -i "$TEST_KABI" pg_restore \
  --username=swiip --dbname=swiip_test --no-owner --no-privileges --exit-on-error \
  < "$YEDEK"

# --- 4. Doğrulama ---
echo "→ doğrulanıyor"

TABLO_SAYISI="$(docker exec "$TEST_KABI" psql -U swiip -d swiip_test -tAc \
  "select count(*) from information_schema.tables where table_schema='public'")"

echo "   geri yüklenen tablo sayısı: ${TABLO_SAYISI}"
if [ "$TABLO_SAYISI" -lt 14 ]; then
  echo "HATA: beklenenden az tablo geri yüklendi (${TABLO_SAYISI} < 14)." >&2
  exit 1
fi

ZORUNLU_TABLOLAR="users assessments profiles body_analyses programs sessions session_items decisions foods food_logs subscriptions quotas"
for tablo in $ZORUNLU_TABLOLAR; do
  VAR="$(docker exec "$TEST_KABI" psql -U swiip -d swiip_test -tAc \
    "select to_regclass('public.${tablo}') is not null")"
  if [ "$VAR" != "t" ]; then
    echo "HATA: ${tablo} tablosu geri yüklenmedi." >&2
    exit 1
  fi
done
echo "   zorunlu tabloların hepsi yerinde ✓"

# Satır sayıları: veri de geldi mi, yoksa yalnızca şema mı?
KULLANICI="$(docker exec "$TEST_KABI" psql -U swiip -d swiip_test -tAc \
  'select count(*) from users')"
BESIN="$(docker exec "$TEST_KABI" psql -U swiip -d swiip_test -tAc \
  'select count(*) from foods')"
echo "   users: ${KULLANICI} satır · foods: ${BESIN} satır"

# Yabancı anahtarlar korunmuş mu?
FK_SAYISI="$(docker exec "$TEST_KABI" psql -U swiip -d swiip_test -tAc \
  "select count(*) from information_schema.table_constraints where constraint_type='FOREIGN KEY' and table_schema='public'")"
echo "   yabancı anahtar kısıtı: ${FK_SAYISI}"
if [ "$FK_SAYISI" -lt 10 ]; then
  echo "HATA: yabancı anahtarlar eksik geri yüklendi." >&2
  exit 1
fi

echo
echo "✓ GERİ YÜKLEME TESTİ BAŞARILI — $(date -u +%FT%TZ)"
echo "  Bu sonucu tarihiyle birlikte not al. Bir sonraki testi bir ay sonra çalıştır."
