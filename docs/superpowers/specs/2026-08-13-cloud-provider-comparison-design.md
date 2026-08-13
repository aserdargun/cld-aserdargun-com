# Cloud Provider Karşılaştırma Uygulaması — Tasarım Belgesi

## 1. Amaç

`cld-aserdargun-com`, Türkiye'den satın alınabilen bulut hizmetlerini resmî fiyat kaynaklarına dayanarak karşılaştıran Türkçe bir karar destek uygulamasıdır. Azure, Google Cloud ve AWS ana sağlayıcılardır. Fiyat avantajıyla öne çıkan Hetzner Cloud, Oracle Cloud, Cloudflare, DigitalOcean ve Vultr da kapsama alınır.

Uygulama şu sorulara hızlı ve denetlenebilir yanıt vermelidir:

- Belirli bir kullanım senaryosu için tahmini aylık maliyet nedir?
- Hangi sağlayıcı, hangi servis kategorisinde fiyat avantajı sunar?
- Azure ve Google Cloud başta olmak üzere ücretsiz kullanım imkânları nelerdir?
- Fiyat hangi bölge, kapasite, ölçüm birimi ve resmî kaynağa dayanır?

## 2. Kapsam ve sınırlar

### İlk sürüm kapsamı

- Ana sağlayıcılar: Microsoft Azure, Google Cloud ve Amazon Web Services
- Ekonomik alternatifler: Hetzner Cloud, Oracle Cloud, Cloudflare, DigitalOcean ve Vultr
- Servis kategorileri: sanal sunucu, GPU/AI, nesne depolama, yönetilen veritabanı, serverless, CDN/ağ ve Kubernetes
- Kullanım senaryoları: küçük web uygulaması, API/backend, veritabanlı SaaS, statik site, AI/GPU ve yüksek trafikli servis
- Türkiye'den bireysel veya kurumsal hesapla satın alma imkânı bulunan genel kullanıma açık teklifler
- Türkiye'ye yakın Avrupa bölgeleri; eşdeğer seçeneklerde İstanbul'a ağ yakınlığı ve bölge bulunabilirliği ayrıca gösterilir
- Vergiler hariç USD karşılaştırması

### İlk sürüm dışında kalanlar

- Azure, GCP, AWS veya başka bir sağlayıcı üzerinde otomatik kaynak oluşturma
- Kullanıcının bulut hesabına bağlanma veya fatura verisi okuma
- Kurumsal pazarlık indirimleri, özel sözleşmeler ve startup kredileri
- Gerçek zamanlı fiyat API'lerine çalışma zamanında bağımlılık
- Kur, vergi veya Türkiye mevzuatı danışmanlığı
- `cld.aserdargun.com` alan adına ya da Azure'a yayın

Uygulama tamamlanıp doğrulandıktan sonra GitHub'da `aserdargun/cld-aserdargun-com` deposuna gönderilecek ve çalışma burada duracaktır.

## 3. Kullanıcı deneyimi ve bilgi mimarisi

Uygulama tek sayfalı, Türkçe bir analiz panelidir. Masaüstünde tablo yoğunluğunu korur; mobilde ana karşılaştırma tablosu kartlara dönüşmez, yatay kaydırma ve sabit ilk sütunla kullanılmaya devam eder.

### Ekran sırası

1. **Üst bölüm:** Ürünün amacı, kapsam özeti, son genel doğrulama tarihi ve Türkiye'den satın alma kapsam notu.
2. **Senaryo özeti:** Seçilen kullanım senaryosu için öne çıkan sağlayıcılar, tahmini aylık toplamlar ve maliyeti etkileyen ana kalemler.
3. **Karşılaştırma tablosu:** Sağlayıcı, servis, yakın Avrupa bölgesi, kapasite, saatlik ve aylık USD fiyatı, ücretsiz kota, trafik maliyeti, doğrulama tarihi ve resmî kaynak.
4. **Ücretsiz kullanım:** Azure ve Google Cloud ayrıntılı olmak üzere AWS ve Oracle Cloud ücretsiz teklifleri; süreli deneme, süreli ücretsiz katman ve sürekli ücretsiz kota birbirinden ayrılır.
5. **Senaryo hesaplayıcı:** Kullanıcı kapasite ve kullanım değerlerini değiştirir; işlem, depolama, veritabanı ve trafik maliyetleri ayrı gösterilir.
6. **Sağlayıcı ayrıntıları:** Güçlü yönler, sınırlamalar, bölge seçenekleri, ödeme/erişim notları ve resmî kaynaklar.
7. **Metodoloji:** Fiyatların nasıl normalize edildiği, varsayımlar, hariç tutulan kalemler ve güncellik politikası.

### Görsel yön

- Koyu lacivert ile açık gri tabanlı, profesyonel analiz paneli
- Sağlayıcı renkleri yalnız logo, rozet ve küçük durum vurgularında kullanılır
- Açık hiyerarşi, yüksek okunabilirlik ve yoğun tablo görünümü
- Dekoratif kart yığınları yerine tablolar, açık bantlar ve karşılaştırma alanları
- Hareket yalnız filtre ve sonuç değişimini anlaşılır kılmak için kullanılır; azaltılmış hareket tercihi desteklenir

## 4. Karşılaştırma yaklaşımı

### Fiyat normalizasyonu

- Hesaplama para birimi USD'dir.
- Sağlayıcının resmî USD fiyatı varsa doğrudan kullanılır.
- Yalnız EUR veya başka bir para birimi yayımlanıyorsa özgün fiyat da saklanır; USD değeri Avrupa Merkez Bankasının doğrulama günündeki referans kuru kullanılarak dönüştürülür. İlgili para birimi için referans kur yoksa kayıt USD sıralamasına alınmaz. Arayüz özgün para birimini, kullanılan kuru ve kur tarihini gösterir.
- Vergiler, promosyon kodları, kurumsal pazarlıklar ve özel krediler toplamın dışında tutulur.
- Sürekli çalışan işlem kaynaklarında aylık tahmin için 730 saat kullanılır.
- Saatlik fiyat, aylık üst sınır veya sağlayıcının sabit aylık fiyatı varsa her biri ayrı saklanır; hesaplama sağlayıcının faturalama kuralına göre yapılır.
- Depolama, istek, veritabanı, trafik/egress ve yönetim bedelleri mümkün olduğu ölçüde ayrı maliyet kalemleridir.

### Fiyat avantajı sunumu

Tek bir soyut puan kullanılmaz. Aynı kategori ve senaryodaki karşılaştırılabilir teklifler için:

- En düşük tahmini aylık toplam
- İkinci en düşük tahmini aylık toplam
- Ücretsiz kota sonrası toplam
- Trafik dahil ve trafik hariç toplam
- Taahhütsüz fiyat ile taahhütlü fiyat

ayrı etiketlenir. Yönetilen servis kapsamı, bölge yakınlığı ve operasyonel sınırlamalar parasal sonuçtan ayrı nitelikler olarak gösterilir. Böylece “en ucuz” ile “en uygun” aynı şeymiş gibi sunulmaz.

### Ücretsiz kullanım sınıfları

- Yeni hesap kredisi
- Belirli süre ücretsiz servis
- Sürekli ücretsiz kota
- Sadece uygun hesap/ödeme türüyle kullanılabilen teklif

Her kayıtta kota, süre, uygunluk, aşım fiyatı, otomatik ücretlenme riski ve resmî koşul bağlantısı bulunur. Öğrenci, startup veya davetle verilen krediler genel ücretsiz tabloya karıştırılmaz.

## 5. Veri modeli

Fiyat verisi uygulama kodundan ayrı, sürümlü JSON dosyalarında tutulur ve TypeScript şemasıyla doğrulanır.

### Sağlayıcı

- Kimlik, ad, kısa ad ve resmî site
- Türkiye'den satın alma durumu: doğrulandı, koşullu veya doğrulanamadı
- Ödeme/kimlik doğrulama notu ve doğrulama tarihi
- Avrupa bölgeleri

### Servis teklifi

- Sağlayıcı ve servis kimliği
- Kategori ve ürün adı
- Bölge
- vCPU, RAM, disk, trafik, GPU modeli/VRAM veya kategoriye uygun kapasite alanları
- Fiyatlandırma birimi ve faturalama modeli
- Özgün fiyat/para birimi
- Normalize USD fiyatı ve kur referansı
- Ücretsiz kota ilişkisi
- Egress, istek ve ek ücret notları
- Resmî fiyat kaynağı, doğrulama tarihi ve kaynak erişim tarihi

### Ücretsiz teklif

- Teklif tipi, uygunluk, başlangıç/bitiş koşulu
- Kota ve ölçüm birimi
- Aşım davranışı ve ücretlenme notu
- Resmî koşul bağlantısı ve doğrulama tarihi

### Senaryo

- İşlem süresi ve gerekli kapasite
- Depolama miktarı ve sınıfı
- Aylık giriş/çıkış trafiği
- Veritabanı kapasitesi
- İstek veya çağrı sayısı
- GPU türü ve çalışma saati (uygunsa)

### Veri sağlığı

- 30 günden eski fiyat kayıtları “yeniden doğrulanmalı” olarak işaretlenir.
- Zorunlu alanı veya geçerli resmî kaynağı olmayan kayıt toplam ve sıralamaya girmez.
- Belirsiz fiyat sıfır kabul edilmez; “doğrulanamadı” olarak gösterilir.
- Kullanıcı arayüzü son doğrulama tarihini her fiyat sonucuyla birlikte gösterir.

## 6. Teknik mimari

Uygulama React, TypeScript ve Vite ile statik olarak oluşturulur. Sunucu, hesap sistemi veya veritabanı gerektirmez.

### Modüller

- **Veri şeması:** JSON kayıtlarını yükler ve yapısal olarak doğrular.
- **Fiyat motoru:** Birimleri normalize eder, 730 saat varsayımını uygular ve maliyet kalemlerini hesaplar.
- **Karşılaştırma motoru:** Yalnız aynı kategori ve senaryoda karşılaştırılabilir sonuçları sıralar.
- **Filtre durumu:** Sağlayıcı, kategori, bölge, ücretsiz kota ve fiyat özelliklerini yönetir.
- **Sunum bileşenleri:** Genel bakış, tablo, ücretsiz katman, hesaplayıcı, sağlayıcı ayrıntısı ve metodoloji bölümlerini oluşturur.
- **Kaynak görünümü:** Her fiyatın resmî bağlantısını, doğrulama tarihini ve varsa kur dönüşümünü açıklar.

Bu ayrım sayesinde veri güncellemeleri hesaplama veya arayüz kodunun değiştirilmesini gerektirmez; hesaplama motoru da görsel bileşenlerden bağımsız test edilir.

### Veri akışı

1. Sürümlü fiyat ve ücretsiz teklif dosyaları derleme sırasında şemadan geçirilir.
2. Kullanıcı bir senaryo seçer veya değerleri değiştirir.
3. Fiyat motoru her uygun teklif için ayrıntılı maliyet dökümü üretir.
4. Geçersiz, eski veya karşılaştırılamaz kayıtlar durum bilgileriyle ayrılır.
5. Karşılaştırma motoru geçerli sonuçları sıralar.
6. Arayüz toplamı, maliyet kalemlerini, ücretsiz kota etkisini ve kaynakları birlikte gösterir.

## 7. Hata ve belirsizlik yönetimi

- Veri dosyası şemaya uymuyorsa üretim derlemesi başarısız olur.
- Tek bir kaynağın eksik olması tüm uygulamayı bozmaz; kayıt sonuçlardan çıkarılır ve veri kalite raporunda gösterilir.
- Fiyatı doğrulanamayan hizmet için tahmin üretilmez.
- Para birimi dönüşümü eksikse özgün fiyat gösterilir fakat USD sıralamasına alınmaz.
- Ücretsiz kota aşımı hesaplanamıyorsa toplam fiyat yerine açıklayıcı uyarı gösterilir.
- Bölgesel bulunabilirlik değişebileceğinden her bölge kaydı kaynak ve tarihle sunulur.
- “Türkiye'den satın alınabilir” ifadesi garanti değil, araştırma tarihindeki genel hesap açma ve ödeme uygunluğu olarak tanımlanır.

## 8. Test ve doğrulama

### Otomatik kontroller

- Birim dönüşümü, 730 saat hesabı, ücretsiz kota düşümü ve maliyet toplama testleri
- Kategori bazında karşılaştırılabilirlik ve sıralama testleri
- Veri şeması, benzersiz kimlik, tarih, para birimi ve zorunlu kaynak kontrolleri
- Eski kayıt, eksik kur ve doğrulanamayan fiyat davranışı testleri
- Filtre, senaryo seçimi ve hesaplayıcı etkileşim testleri
- Üretim derlemesi, tip kontrolü ve kod kalitesi denetimi

### Görsel ve kullanıcı akışı doğrulaması

- Masaüstü, tablet ve mobil görünüm
- Tablo yatay kaydırma ve sabit ilk sütun davranışı
- Klavye kullanımı, odak görünürlüğü, renk kontrastı ve azaltılmış hareket
- Temel akış: senaryo seçme → değer değiştirme → sonuç sıralama → maliyet dökümü → resmî kaynağa gitme
- Azure ve GCP ücretsiz tekliflerinin tür, süre, kota ve koşul bakımından doğru ayrılması
- Görünen bağlantıların bozuk olmaması

### Fiyat araştırması kabul ölçütü

- Her görünen fiyat en az bir resmî sağlayıcı kaynağına dayanır.
- Bölge ve ölçüm birimi kaynakla uyumludur.
- Dönüştürülmüş fiyatlarda özgün para birimi ve kur tarihi görünür.
- Resmî kaynakla doğrulanamayan rakam uygulamaya eklenmez.
- GitHub'a gönderilmeden hemen önce veri setinin doğrulama tarihleri ve kaynak bağlantıları tekrar kontrol edilir.

## 9. Teslimat

Depoda şunlar bulunur:

- Çalışan statik web uygulaması
- Kaynaklı ve sürümlü fiyat veri seti
- Azure, GCP, AWS ve Oracle Cloud ücretsiz kullanım tablosu
- Testler ve veri doğrulama komutları
- Kurulum, kullanım ve proje kapsamını anlatan README
- Fiyat metodolojisi ve veri güncelleme rehberi
- Resmî kaynak listesi

Son kabul koşulları; üretim derlemesinin ve testlerin geçmesi, temel kullanıcı akışının gerçek tarayıcıda doğrulanması, fiyat kaynaklarının görünür olması ve projenin `aserdargun/cld-aserdargun-com` GitHub deposuna başarıyla gönderilmesidir. GitHub gönderiminden sonra Azure veya alan adı yayını yapılmaz.
