/**
 * Oturum açıldıktan sonra, yönlendirmeden ÖNCE iki kare bekler.
 *
 * Giriş ya da kayıt `kullanici`yı dolduruyor ve sözlük hesabın diline dönüyor; bu,
 * `(giris)` yığınının başlık seçeneklerini günceller. Yönlendirme aynı karede o yığını
 * sökerse başlık güncellemesi sökülen fragment'a düşüyor ve Android'de uygulama
 * "ScreenStackFragment added into a non-stack container" ile çöküyor. Hesap dili
 * cihaz dilinden farklı olan herkes girişte bunu yaşıyordu.
 *
 * İki kare: ilki React'in yeni dili işlemesi, ikincisi yerel katmanın uygulaması için.
 */
export function sozlukKaresiniBekle(): Promise<void> {
  return new Promise((coz) => requestAnimationFrame(() => requestAnimationFrame(() => coz())));
}
