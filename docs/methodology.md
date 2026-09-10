# Fiyat ve karşılaştırma metodolojisi

## Amaç ve veri fotoğrafı

Uygulama, Türkiye’den erişilebilen genel bulut tekliflerini kaynaklı ve tekrar denetlenebilir biçimde karşılaştırır. Mevcut katalog fotoğrafı **2026-09-04** tarihlidir. Her görünür fiyat, ücretsiz katman, bölge, satın alma notu ve döviz kuru arayüzde resmî kaynak ve erişim tarihiyle ilişkilidir.

Bu çalışma teklif, fatura tahmini garantisi, vergi danışmanlığı veya sağlayıcı önerisi değildir. Fiyatların ve uygunluk koşullarının satın alma öncesinde yeniden doğrulanması gerekir.

## Fiyat normalizasyonu

- Sürekli çalışan işlem kaynaklarında aylık süre **730 saat** kabul edilir. Arayüzdeki “Modellenen aylık tutar”, yalnız seçili senaryonun görünür kapsam notunda sayılan ve katalogda fiyatı bulunan bileşenlerin toplamıdır; tam fatura vaadi değildir.
- Sağlayıcının resmî USD fiyatı varsa doğrudan kullanılır.
- EUR fiyatlarda özgün tutar, ölçüm birimi ve varsa aylık üst sınır korunur. USD karşılığı, teklifin doğrulama gününde geçerli olan ECB EUR→USD referans kuru ile hesaplanır. Arayüz hem özgün EUR değerini hem dönüşmüş USD değerini hem de kur tarihini gösterir.
- Uygun tarihli ECB kuru yoksa özgün fiyat gösterilebilir; USD toplamı üretilemez ve teklif sıralamaya alınmaz.
- Vergiler, kart/ödeme kuruluşu ücretleri, rezervasyon/taahhüt fiyatları, pazarlık indirimleri, kuponlar, startup/öğrenci/davet kredileri ve belgelenmemiş fatura bileşenleri hesaplamaya alınmaz.
- Promosyon, spot/preemptible ve kurumsal sözleşme fiyatları yerine aksi açıkça belirtilmedikçe taahhütsüz genel liste fiyatı kullanılır.

## Bileşenlerin ele alınması

Her teklif bir veya daha çok fiyat bileşenine sahiptir. Hesaplayıcı tüm kayıtlı bileşenleri ayrı satırlar olarak hesaplar ve sonra toplar:

- İşlem ve GPU: senaryodaki aylık çalışma veya GPU saati ile çarpılır; sağlayıcının aylık üst sınırı varsa saatlik tutar ile üst sınırın küçüğü kullanılır.
- Depolama ve veritabanı: senaryodaki GB-ay miktarından kayıtta açıkça belirtilen dahil miktar düşülür.
- İstek: milyon istek cinsindeki miktardan açık dahil kota düşülür.
- Trafik/CDN: dış trafik GB miktarından kayıtlı dahil trafik düşülür. Giriş trafiği yalnız resmî kayıtta ayrı ücretli bir bileşen olarak bulunursa eklenir.
- Sabit paket: ayda bir kez eklenir; paketin içerdiği kapasite senaryoyu karşılamıyorsa teklif tamamlayıcı sonuç sayılmaz.

İstek, storage operation, retrieval, origin trafiği, veritabanı depolaması/HA/yedekleme, worker node, disk, IP, lisans ve destek gibi kayıtlı olmayan zorunlu olabilecek parçalar teklif notlarında hariç tutulan kalem olarak gösterilir. Belgelenmemiş bir tutar tahmin edilmez.

## Ücretsiz katmanlar

Yeni hesap kredisi, süreli ücretsiz servis, sürekli ücretsiz kota ve uygunlukla sınırlı teklif ayrı sınıflardır. Kotalar ve krediler birbiriyle toplanmaz. Kullanıcının hesap yaşı, bölgesi, ödeme türü ve diğer koşulları karşılandığı varsayılmaz. Fiyat motoru yalnız açıkça uygun işaretlenmiş ve ilgili teklif/bileşenle eşleşen ücretsiz kaydı uygulayabilir; mevcut genel senaryo toplamları kullanıcı uygunluğunu kabul etmez.

Her ücretsiz satır kota, dönem, süre, uygunluk, aşım davranışı ve otomatik ücret riskiyle gösterilir. Öğrenci, startup veya davetle açılan özel krediler genel ücretsiz tabloya katılmaz.

## Karşılaştırılabilirlik ve sıralama

Bir sağlayıcı tahmini ancak senaryonun açıkça beyan edilen bütün kullanım boyutları gerekli kategorilere atanmış, bu boyutları karşılayan güncel ve sıralanabilir teklifler bulunmuş ve tüm fiyat bileşenleri hesaplanmışsa eksiksiz kabul edilir. Eksik kaynak veya kapasite bilinmeyen değer sıfır sayılmaz; toplam üretilmez. Eksiksiz ve güncel USD toplamları içinde en düşük ve ikinci en düşük sonuç etiketlenir.

Sağlayıcıya bağlı bölge filtresi, aynı bölge kimliğini kullanan sağlayıcıları birbirinden bağımsız tutar ve hem sıralama adaylarını hem servis tablosunu aynı anda daraltır. Gerekli kategoriyi karşılayan bölge kapatılırsa sağlayıcı seçili kalabilir; ancak eksik kategori ve kullanım boyutları ayrı gösterilir, modellenen aylık tutar üretilmez ve sonuç sıralanmaz.

Kategori-tam kapsama değerlendirmesi senaryonun o kategoriye yansıttığı kullanım boyutlarına göre yapılır. İşlemde çalışma süresi/vCPU/RAM, GPU'da GPU-saat ve GPU belleği, depolama ve CDN'de ise elastik sayaç veya belgeli sabit GB sınırı dikkate alınır. Bir boyut yalnız atandığı kategori projeksiyonunda hesaplanır; örneğin depolama miktarı CDN çıkış fiyatına taşınmaz. Elastik ve sabit paketler ancak tanımlı kapasite ve gerçek senaryo miktarıyla savunulabilir olduğunda karşılaştırılır.

En ucuz sonuç otomatik olarak en uygun çözüm değildir. Mimari, CPU türü ve performansı, yönetim kapsamı, güvenilirlik, veri yerleşimi, destek, ekosistem, kilitlenme riski ve bölge gecikmesi parasal sıralamadan ayrı değerlendirilmelidir.

## Veri sağlığı

- Bir fiyat ya da ücretsiz katman doğrulama tarihinden **30 gün** sonra “yeniden doğrulanmalı” olur.
- Zorunlu alanı, resmî kaynak bağlantısı veya geçerli döviz kuru eksik kayıt “doğrulanamadı” olur. Var olan bir kaynak kimliği de yalnız beklenen sağlayıcıya ve kanıt türüne (fiyat, ücretsiz katman, bölge, satın alma veya kur) aitse geçerlidir.
- Eski kayıtlar istenirse tabloda görülebilir; geçersiz ve eksik toplamlar sıralamaya alınmaz.
- Eksik veya çözülemeyen bir değer hiçbir zaman sıfıra çevrilmez.
- Kaynağın açılması tek başına fiyatın/kotanın güncel olduğu anlamına gelmez; bölge, birim, para birimi ve uygunluk iddiası da kaynak gövdesi ya da resmî API cevabında yeniden doğrulanmalıdır.

## Türkiye'den satın alma anlamı

“Doğrulandı”, resmî belgede Türkiye/Türkiye faturalaması veya ülkeye açık ödeme yöntemi için doğrudan kanıt bulunduğunu ifade eder. “Koşullu”, sağlayıcının genel ödeme ve kimlik doğrulama yöntemlerini belgelediğini ancak Türkiye'den her hesabın açılacağını açıkça garanti etmediğini ifade eder. “Doğrulanamadı” durumunda yeterli resmî kanıt yoktur.

Bu durumların hiçbiri kartın kabul edileceği, kimlik incelemesinin geçileceği, belirli bir bölgede stok bulunacağı ya da hesabın askıya alınmayacağı garantisi değildir.

## Ekonomik alternatiflerin kanıt politikası

Hetzner, Oracle Cloud, DigitalOcean ve Vultr için en az iki ayrı teklif; aynı kategori projeksiyonunda güncel, sayısal ve kategori-tam ana sağlayıcı tekliflerine göre savunulabilir fiyat avantajı göstermelidir. Aynı teklif farklı senaryolarda tekrar sayılmaz.

İnsan tarafından onaylanan dar kapsam istisnasıyla Cloudflare için tek savunulabilir fiyat avantajı kanıtı yeterlidir: statik site senaryosunun yalnız depolama boyutunu içeren projeksiyonunda R2 Standard. Çıkış trafiği CDN kategorisine atanır; işlem/istek karışımı bu senaryoda sıfırdır ve hariç tutulur. Bu, Cloudflare'a uydurma ikinci bir kanıt eklemek yerine ürün yapısındaki farklılığı açıkça kabul eden bir kapsam politikasıdır. Workers Paid görünür bir teklif olabilir ancak avantaj kanıtı sayılmaz.

## Yeniden üretilebilir örnekler

- Çok bileşenli USD örneği, DigitalOcean Spaces ve statik site senaryosu: `5 USD sabit + max(50 - 250, 0) × 0,02 + max(500 - 1.024, 0) × 0,01 = 5 USD/ay`.
- EUR→USD örneği, Hetzner CX23 ve 730 saat: önce `min(730 × 0,0088 EUR, 5,49 EUR) = 5,49 EUR`; ardından 2026-08-13 tarihli `1 EUR = 1,1534 USD` ECB kuru ile `5,49 × 1,1534 = 6,332166 USD/ay`.

Yuvarlatılmış arayüz gösterimi ile hesap motorunun tam hassasiyetli değeri farklı basamak sayısına sahip olabilir.

Fiyat modelinin davranış sürümü: **2026-09-10**. Süreli ücretsiz katmanda hesap yaşı tamamlanan ay olarak değerlendirilir: yaş, kota süresinden küçük olmalıdır. Örneğin 12 aylık hak 12. ay tamamlandığında sona erer. Negatif veya sonlu olmayan hesap yaşı hak oluşturmaz; taşan sayısal tutarlar fiyat sıralamasına alınmaz.
