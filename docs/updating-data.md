# Veri güncelleme rehberi

Katalog kaynak denetlenebilirliğini korumak için fiyat, ücretsiz katman, sağlayıcı ve kur verilerini uygulama kodundan ayrı JSON dosyalarında tutar. Güncelleme yalnız resmî sağlayıcı sayfası/API'si veya ECB referans kuru ile yapılır; üçüncü taraf fiyat siteleri, arama sonucu özetleri, bloglar, reseller sayfaları ve hatırlanan değerler kanıt değildir.

## Zorunlu sıra

```text
1. Open the existing official source URL.
2. Confirm region, unit, currency and eligibility.
3. Update original price and verifiedAt; never edit only converted USD.
4. Add the dated ECB rate when source currency is not USD.
5. Run npm run validate:data and npm run test.
6. Review the affected UI row and source link in the browser.
```

Kaynak URL'sinin HTTP 200 dönmesi veya sayfanın tarayıcıda açılması yeterli değildir. İlgili fiyat/kota, birim, para birimi, bölge, kapasite ve uygunluk ifadesi sayfa gövdesi, seçilmiş resmî fiyat görünümü veya resmî makine-okunur API cevabında bulunmalıdır. Dinamik ya da bot korumalı sayfada claim yeniden görülemiyorsa tarih ilerletilmez; sınırlama raporlanır ve gerekirse daha açık bir resmî API/sayfa kullanılır.

## Dosyalar ve bütünlük kuralları

- `src/data/providers.json`: satın alma durumu, not, kaynaklar ve bölgeler
- `src/data/offers.json`: servis, kategori, kapasite, fiyat bileşenleri, kaynaklar ve hariç tutulan kalemler
- `src/data/free-tiers.json`: ücretsiz sınıf, kota, süre, uygunluk, aşım ve otomatik ücret notu
- `src/data/exchange-rates.json`: özgün para birimini USD'ye dönüştüren tarihli ECB oranı
- `src/data/sources.json`: kaynak sahibi, türü, URL'si ve erişim tarihi
- `src/data/scenarios.json`: hesaplayıcı senaryoları ve gereksinimleri

Sağlayıcı, kaynak, teklif, ücretsiz katman, kur ve senaryo kimlikleri kendi koleksiyonlarında benzersiz olmalıdır. Tüm `sourceIds`, `purchaseSourceIds`, bölge `sourceId` alanları ve kur kaynağı geçerli bir kaynak kaydına bağlanmalıdır. Kaynak sahibi ve türü kullanım alanıyla uyuşmalıdır: örneğin fiyat teklifi kendi sağlayıcısına ait `pricing`, kur ise ECB'ye ait `exchange-rate` kaynağına bağlanır.

Kaynakların `accessedAt` tarihi, teklifler ve ücretsiz katmanların `verifiedAt` tarihi ile katalog fotoğrafı birlikte ilerletilir. Sadece dönüştürülmüş USD tutarını değiştirmeyin; özgün fiyat, para birimi, birim ve tarihli ECB oranı kanonik kayıttır.

## Ekonomik alternatif doğrulaması

Doğrulayıcı, alternatif sağlayıcı kanıtlarını gerçek senaryonun kategori projeksiyonu ve fiyat motoruyla yeniden hesaplar. Hetzner, Oracle Cloud, DigitalOcean ve Vultr için iki ayrı güncel, sıralanabilir, kategori-tam ve ana sağlayıcılara karşı savunulabilir fiyat avantajı gösteren teklif gerekir. İnsan onaylı kapsam istisnası nedeniyle Cloudflare için statik site depolama projeksiyonundaki R2 Standard kanıtı yeterlidir. Aynı teklif farklı senaryolarda tekrar sayılmaz; atanmamış/eksik boyut, uydurma kapasite veya uygun olmayan sabit/elastik karşılaştırma kanıt değildir.

## İnceleme kontrol listesi

- [ ] Değişen iddia yalnız resmî sağlayıcı/ECB kaynağıyla doğrulandı.
- [ ] Kaynak gövdesi veya API cevabı fiyat/kota, bölge, birim, para birimi ve uygunluğu gerçekten destekliyor.
- [ ] Promosyon, spot, taahhüt, vergi ve zorunlu olabilecek hariç kalemler notlarda doğru.
- [ ] Özgün para birimi, aylık üst sınır ve dahil miktarlar korunuyor.
- [ ] EUR kaydında aynı fotoğraf tarihine uygun ECB EUR→USD oranı var.
- [ ] Kimlikler benzersiz ve bütün yabancı anahtarlar geçerli sahip/türdeki kaynağa gidiyor.
- [ ] Ücretsiz kota yalnız uyumlu teklif ve fiyat bileşenine bağlanıyor; uygunluk varsayılmıyor.
- [ ] Alternatif sağlayıcı fiyat avantajı politikası hâlâ geçiyor.
- [ ] `npm run validate:data`, `npm run test`, `npm run check` ve `npm run e2e` başarılı.
- [ ] Etkilenen masaüstü/mobil tablo satırı, tarih, kur bilgisi ve resmî kaynak bağlantısı gerçek tarayıcıda görüldü.
- [ ] Dinamik/bot korumalı veya semantik olarak yeniden doğrulanamayan kaynaklar raporlandı; tarihi yalnız sayfa açıldı diye güncellenmedi.

## Değişiklik kaydı

Her veri güncellemesi; değişen kaynakları, eski/yeni değeri, yeniden hesaplanan temsilî senaryoyu, erişim sınırlamalarını ve çalıştırılan kontrolleri commit veya inceleme raporunda belirtmelidir. Belirsiz bir değeri tahmin etmek yerine satırı sıralama dışı bırakmak ya da kapsamdan çıkarmak tercih edilir.
