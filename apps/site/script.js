/**
 * Made2Fit sitesi.
 *
 * Üç iş var ve üçü de sayfanın metaforuna bağlı:
 *  1. Taksimat rayını çizmek ve kaydırma konumunu kumpas ağzıyla göstermek.
 *  2. Karar izlerini döndürmek — ürünün iddiası bu, o yüzden sayfa da onu yapıyor.
 *  3. Haber listesi formunu göndermek.
 *
 * Çerçeve yok, derleme adımı yok. Pazarlama sayfasının en hızlı hâli bu.
 */

(() => {
  'use strict';

  const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* 1. Taksimat rayı                                                    */
  /* ------------------------------------------------------------------ */

  const olcek = document.getElementById('ray-olcek');
  const liste = document.getElementById('ray-liste');
  const kumpas = document.getElementById('ray-kumpas');
  const bolumler = [...document.querySelectorAll('[data-bolum]')];

  /** Ray dikey mi? Dar ekranda yatay bir şerite dönüşüyor. */
  const dikeyMi = () => window.matchMedia('(min-width: 62rem)').matches;

  /** Logodaki cetvel tabanının ritmi: her beşinci çentik uzun. */
  function cizikleriCiz() {
    if (!olcek) return;
    const dikey = dikeyMi();
    const uzunluk = dikey ? olcek.clientHeight : olcek.clientWidth;
    const aralik = 12;
    const adet = Math.max(0, Math.floor(uzunluk / aralik));
    const parca = document.createDocumentFragment();

    for (let i = 0; i <= adet; i += 1) {
      const cizik = document.createElement('span');
      cizik.className = `ray-cizik ${i % 5 === 0 ? 'uzun' : 'kisa'}`;
      cizik.style[dikey ? 'top' : 'left'] = `${i * aralik}px`;
      parca.appendChild(cizik);
    }

    olcek.replaceChildren(parca);
  }

  function listeyiKur() {
    if (!liste) return;
    liste.replaceChildren(
      ...bolumler.map((bolum) => {
        const oge = document.createElement('li');
        const bag = document.createElement('a');
        bag.href = `#${bolum.id}`;
        bag.textContent = bolum.dataset.bolum;
        oge.appendChild(bag);
        return oge;
      }),
    );
  }

  /**
   * Okunan bölümün sırası.
   *
   * Hem kumpas ağzı hem raydaki etiket işareti bunu kullanıyor. Önce ikisi ayrı ayrı
   * hesaplıyordu ve birbirinden kayıyordu: etiket "Motor" derken ağız başka yeri
   * gösteriyordu.
   */
  function okunanBolum() {
    const cizgi = window.innerHeight / 2;
    let indis = 0;
    for (let i = 0; i < bolumler.length; i += 1) {
      if (bolumler[i].getBoundingClientRect().top <= cizgi) indis = i;
    }
    return indis;
  }

  /**
   * Kumpas ağzı okunan bölümün taksimatına kilitleniyor.
   *
   * Eskiden ham kaydırma yüzdesini çiziyordu. Cetvelin çentikleri eşit aralıklı ama
   * bölümler eşit boyda değil; ağız hiçbir zaman okunan bölümün etiketine denk
   * gelmiyordu. Bir ölçü aletinde bu, ibrenin yanlış yeri göstermesi demek.
   *
   * Ara değer de denendi — bölüm boyunca etiketten etikete süzülmek. O da yanlıştı:
   * bölümün ortasındayken ağız iki etiketin arasında kalıyor ve neyi gösterdiği
   * belirsizleşiyor. Kumpas ağzı bir çentiğe oturur, arada durmaz. Geçişi CSS'teki
   * 240 ms yumuşatıyor.
   */
  function kumpasiGuncelle() {
    if (!kumpas || !liste) return;
    const baglar = [...liste.querySelectorAll('a')];
    if (baglar.length === 0) return;

    const dikey = dikeyMi();
    const bag = baglar[Math.min(okunanBolum(), baglar.length - 1)];
    const rayKutu = liste.parentElement.getBoundingClientRect();
    const kutu = bag.getBoundingClientRect();
    const yer = dikey
      ? kutu.top + kutu.height / 2 - rayKutu.top - kumpas.offsetHeight / 2
      : kutu.left + kutu.width / 2 - rayKutu.left - kumpas.offsetWidth / 2;

    kumpas.style.transform = dikey ? `translateY(${yer}px)` : `translateX(${yer}px)`;
  }

  function aktifBolumuIsaretle() {
    if (!liste) return;
    const aktif = bolumler[okunanBolum()];

    liste.querySelectorAll('a').forEach((bag) => {
      const eslesti = bag.getAttribute('href') === `#${aktif.id}`;
      if (eslesti) bag.setAttribute('aria-current', 'true');
      else bag.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Karar izleri                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Gerçek kural kimlikleri ve gerçek hareket adları.
   *
   * Uydurma örnek koymadık: bunların hepsi motorun ürettiği karar izlerinin biçimi.
   * Sayfanın iddiası "gerekçeyi gösteririz" — örnek uydurmak o iddiayı çürütürdü.
   */
  const IZLER = [
    {
      cevap: 'Bel fıtığı tanısı aldım',
      soru: 'S7',
      kural: 'bel_yuku_yuksek',
      onceki: 'Yerden çekiş',
      sonraki: 'Kalça itme',
      not: 'Aynı kas zincirini çalıştıran, bele eksenel yük bindirmeyen muadil.',
    },
    {
      cevap: 'Gecede 5-6 saat uyuyorum',
      soru: 'T2',
      kural: 'uyku_kisa',
      onceki: 'Haftada 18 set',
      sonraki: 'Haftada 16 set',
      not: 'Toparlanamayacağın hacim, yapılmamış hacimden kötüdür.',
    },
    {
      cevap: 'Evde antrenman yapacağım · Dambıl var',
      soru: 'E1',
      kural: 'ekipman_yok',
      onceki: 'Barbell bench press',
      sonraki: 'Dambıl göğüs presi',
      not: 'Ekipmanı olmayan hareket asla önerilmiyor.',
    },
    {
      cevap: 'Şınavda 20 tekrara ulaştım',
      soru: 'A8',
      kural: 'tekrar_tavani',
      onceki: 'Şınav · 20 tekrar',
      sonraki: 'Arkadan yükseltilmiş şınav',
      not: 'Yirmi tekrarın üstünde uyaran dayanıklılığa kayar; varyasyon zorlaşır.',
    },
  ];

  const izGovde = document.getElementById('iz-govde');
  const izSayac = document.getElementById('iz-sayac');
  let izSira = 0;

  function adim(tur, sinif, icerik) {
    const satir = document.createElement('div');
    satir.className = `iz-adim ${sinif}`;

    const etiket = document.createElement('span');
    etiket.className = 'iz-tur';
    etiket.textContent = tur;

    const deger = document.createElement('span');
    deger.className = 'iz-deger';
    if (typeof icerik === 'string') deger.textContent = icerik;
    else deger.appendChild(icerik);

    satir.append(etiket, deger);
    return satir;
  }

  function degisim(onceki, sonraki) {
    const kap = document.createDocumentFragment();
    const a = document.createElement('span');
    a.textContent = onceki;
    a.style.textDecoration = 'line-through';
    a.style.color = 'var(--murekkep-silik)';
    const ok = document.createElement('span');
    ok.className = 'iz-ok';
    ok.textContent = '→';
    const b = document.createElement('span');
    b.textContent = sonraki;
    kap.append(a, ok, b);
    return kap;
  }

  /**
   * Yer varsa hepsi, yoksa sırayla.
   *
   * Geniş ekranda içeriği döndürüp yanına boşluk bırakmak, o boşluğu israf etmek olur.
   * Ekran yeterince büyükse dört izin dördü de aynı anda duruyor; kullanıcı beklemiyor.
   */
  const hepsiSigarMi = () =>
    window.matchMedia('(min-width: 90rem) and (min-height: 46rem)').matches;

  function izBloku(iz) {
    const kap = document.createDocumentFragment();
    kap.append(
      adim(`Cevap · ${iz.soru}`, 'cevap', iz.cevap),
      adim('Kural', 'kural', iz.kural),
      adim('Programda', 'sonuc', degisim(iz.onceki, iz.sonraki)),
      adim('Neden', 'not', iz.not),
    );
    return kap;
  }

  function iziCiz() {
    if (!izGovde) return;

    if (hepsiSigarMi()) {
      const parcalar = [];
      IZLER.forEach((iz, i) => {
        if (i > 0) {
          const ayirac = document.createElement('hr');
          ayirac.className = 'iz-ayirac';
          parcalar.push(ayirac);
        }
        parcalar.push(izBloku(iz));
      });
      izGovde.replaceChildren(...parcalar);
      // Sıfırla doldurulmuş '04' JetBrains Mono'nun noktalı sıfırıyla '84' gibi okunuyordu.
      if (izSayac) izSayac.textContent = `${IZLER.length} örnek`;
      return;
    }

    const iz = IZLER[izSira];
    izGovde.replaceChildren(izBloku(iz));
    if (izSayac) {
      izSayac.textContent = `${String(izSira + 1).padStart(2, '0')} / ${String(IZLER.length).padStart(2, '0')}`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3. Haber listesi                                                    */
  /* ------------------------------------------------------------------ */

  /** Üretimde boş (aynı origin); ayrı kökten sunulursa meta etiketinden gelir. */
  const apiTabani = () =>
    document.querySelector('meta[name="m2f-api"]')?.getAttribute('content') ?? '';

  const form = document.getElementById('haber-form');
  const durum = document.getElementById('haber-durum');
  const dugme = document.getElementById('haber-dugme');

  function durumYaz(metin, tur) {
    if (!durum) return;
    durum.textContent = metin;
    if (tur) durum.dataset.durum = tur;
    else delete durum.dataset.durum;
  }

  if (form) {
    form.addEventListener('submit', async (olay) => {
      olay.preventDefault();

      const eposta = /** @type {HTMLInputElement} */ (document.getElementById('eposta'));
      const riza = /** @type {HTMLInputElement} */ (document.getElementById('riza'));

      if (!eposta.value.includes('@') || eposta.value.length < 5) {
        durumYaz('Geçerli bir e-posta adresi yaz.', 'hata');
        eposta.focus();
        return;
      }
      if (!riza.checked) {
        durumYaz('Devam etmek için onay kutusunu işaretle.', 'hata');
        riza.focus();
        return;
      }

      if (dugme) dugme.disabled = true;
      durumYaz('Gönderiliyor…');

      try {
        const yanit = await fetch(`${apiTabani()}/v1/ilgi`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ eposta: eposta.value.trim(), riza: true }),
        });

        if (!yanit.ok) throw new Error('sunucu');

        form.reset();
        durumYaz('Kaydedildi. Yayına çıkınca tek bir e-posta göndereceğiz.', 'tamam');
      } catch {
        durumYaz('Kaydedilemedi. Bağlantını kontrol edip tekrar deneyebilirsin.', 'hata');
      } finally {
        if (dugme) dugme.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------ */

  function kur() {
    cizikleriCiz();
    listeyiKur();
    kumpasiGuncelle();
    aktifBolumuIsaretle();
    iziCiz();

    if (!azHareket && IZLER.length > 1) {
      setInterval(() => {
        if (hepsiSigarMi()) return;
        izSira = (izSira + 1) % IZLER.length;
        iziCiz();
      }, 5200);
    }
  }

  let bekliyor = false;
  window.addEventListener(
    'scroll',
    () => {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(() => {
        kumpasiGuncelle();
        aktifBolumuIsaretle();
        bekliyor = false;
      });
    },
    { passive: true },
  );

  window.addEventListener('resize', () => {
    cizikleriCiz();
    kumpasiGuncelle();
    iziCiz();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kur);
  } else {
    kur();
  }
})();
