# CLD Karar Odaklı Yeniden Tasarım Belgesi

Tarih: 29 Ağustos 2026  
Durum: Tasarım yönü kullanıcı tarafından onaylandı; uygulama başlamadı

## 1. Amaç

CLD'nin mevcut kaynak doğrulama, fiyat hesaplama ve fail-closed veri yaklaşımı korunurken kullanıcı deneyimi bir katalog görünümünden karar destek akışına dönüştürülecektir.

Yeni tasarım şu soruları bu sırayla yanıtlamalıdır:

1. Seçtiğim iş yükü için hangi sağlayıcılar gerçekten karşılaştırılabilir?
2. En güçlü seçenekler ne kadar tutuyor ve fiyat farkı neden oluşuyor?
3. Tahmine ne kadar güvenebilirim; hangi maliyetler veya veriler eksik?
4. Ücretsiz katman, bölge ve satın alma koşulları kararı nasıl etkiliyor?
5. Ayrıntılı teklif ve resmî kaynak kanıtına nasıl ulaşırım?

## 2. Korunacak ürün sözleşmesi

- Uygulama Türkçe ve statik React/TypeScript/Vite SPA olarak kalır.
- Türkiye'den satın alma perspektifi, yakın Avrupa bölgeleri ve vergiler hariç USD karşılaştırması korunur.
- Mevcut sekiz sağlayıcı, yedi servis kategorisi ve altı hazır senaryo korunur.
- Aylık sürekli kullanım için 730 saat varsayımı korunur.
- Fiyat ve uygunluk iddiaları yalnız resmî kaynaklara dayanır.
- Eksik, eski, kapasitesi yetersiz veya yanlış kaynağa bağlı kayıtlar sayısal sıralamaya alınmaz.
- Özgün EUR fiyatı ve tarihli ECB dönüşümü korunur.
- Kullanıcı hesabı, bulut hesabı bağlantısı, çalışma zamanı fiyat API'si, fatura içe aktarma veya sunucu tarafı durum eklenmez.
- Commit, push, Azure ve DNS işlemleri bu tasarım çalışmasının kapsamı dışındadır.

## 3. Denetimden çıkan temel sorunlar

29 Ağustos 2026 tarihli yerel tarayıcı denetiminde:

- Masaüstü belge yüksekliği yaklaşık 14.800 px, mobil belge yüksekliği yaklaşık 20.700 px ölçüldü.
- Servis karşılaştırması bölümü masaüstünde yaklaşık 8.450 px yüksekliğindeydi.
- 1.680 px minimum genişliğe sahip ücretsiz katman tablosunda aşım ve otomatik ücretlendirme bilgileri ilk görünümün dışında kalıyordu.
- Tüm sağlayıcı, kategori ve bölgeler varsayılan olarak seçili olduğu için kullanıcı ilk anlamlı daraltmayı kendi yapmak zorundaydı.
- Karşılaştırılamayan sağlayıcılar, doğrulanmış sonuçlarla aynı görsel ağırlığa sahipti.
- Mobil yatay senaryo sekmeleri kırpılıyor ve kullanıcının listedeki konumunu açık göstermiyordu.
- Sağlayıcı ayrıntıları ve metodoloji doğru fakat ana karar akışına göre fazla erken ve fazla uzun sunuluyordu.

## 4. Tasarım ilkeleri

### 4.1 Karar önce, kanıt talep edildiğinde

İlk görünümde sonuç, fiyat tabanı, veri güveni ve ana uyarı bulunur. Teklif satırları, tüm kaynaklar ve kapsam notları açılır ayrıntılarda kalır.

### 4.2 Karşılaştırılabilirlik fiyattan önce

Bir sağlayıcının fiyatı ancak senaryonun zorunlu kategorileri ve kullanım boyutları eksiksiz karşılanıyorsa öne çıkarılır. Karşılaştırılamayan sonuçlar ayrı bir grupta gösterilir ve fiyat sıralamasına görsel olarak karışmaz.

### 4.3 Liste fiyatını açıkça adlandırma

Tahminler `Vergiler hariç genel liste fiyatı` olarak etiketlenir. Taahhüt, sözleşme indirimi, kurumsal pazarlık, destek, lisans ve diğer hariçler sonuç başlığında saklanmaz.

### 4.4 Güven görünür olmalı

Her sonuç için üç ayrı sinyal gösterilir:

- Veri güncelliği: güncel, yeniden doğrulanmalı veya geçersiz.
- Kapsam yeterliliği: eksiksiz veya eksik kategori/boyut.
- Fiyat tabanı: genel liste fiyatı, özgün para birimi ve gerekiyorsa ECB dönüşümü.

Tek bir soyut güven puanı üretilmez. Kullanıcının doğrulanabilir sinyalleri görmesi tercih edilir.

### 4.5 Mobil masaüstünün küçültülmüş hali değildir

Mobilde hazır senaryolar yatay sekme şeridi yerine görünür bir seçim kontrolüyle sunulur. Birincil sonuçlar formun hemen altında kalır; geniş tablolar ana karar akışından çıkarılır.

### 4.6 Ayrıntı yoğunluğu isteğe bağlıdır

Tam veri tabloları korunur ancak varsayılan olarak açılmaz. Kullanıcı `Tüm teklif ayrıntıları` veya `Tüm ücretsiz katman kayıtları` eylemiyle yoğun görünüme geçer.

## 5. Yeni bilgi mimarisi

Sayfa şu sırayla düzenlenir:

1. Ürün başlığı ve veri güven bandı
2. Senaryo çalışma alanı
3. Karar özeti ve öne çıkan sağlayıcılar
4. Seçili sağlayıcıları yan yana karşılaştırma
5. Teklif ayrıntıları
6. Ücretsiz kullanım rehberi
7. Sağlayıcı ve satın alma ayrıntıları
8. Metodoloji ve kaynaklar

Üst navigasyon şu bağlantılardan oluşur:

- Hesapla
- Sonuçlar
- Teklifler
- Ücretsiz kullanım
- Metodoloji

Masaüstünde `Kaynakları incele` ikincil eylemi veri güven bandına taşınır. Mobil menü aynı sırayı kullanır.

## 6. Ekran ve bileşen tasarımı

### 6.1 Üst bölüm ve veri güven bandı

Hero daha kısa ve daha işlevsel olacaktır.

Görünür içerik:

- Başlık: `Bulut maliyetini senaryona göre karşılaştır`
- Açıklama: Türkiye'den erişilebilen servisler için kaynaklı, vergiler hariç liste fiyatı analizi.
- Ana eylem: `Hesaplamaya başla`
- İkincil eylem: `Yöntemi ve kaynakları incele`
- Güven bandı: son doğrulama tarihi, sağlayıcı sayısı, teklif sayısı ve kullanılan resmî kaynak sayısı.
- Fiyat kapsam etiketi: `Genel liste fiyatı · Vergiler hariç · USD`

Güven bandı katalogdan türetilir; sayılar görünür kopyaya sabit yazılmaz.

### 6.2 Senaryo çalışma alanı

Masaüstünde iki sütun kullanılır:

- Sol: senaryo ve kullanım girdileri.
- Sağ: canlı karar özeti.

Mobilde tek sütun kullanılır; karar özeti girdilerin hemen ardından gelir.

Hazır senaryolar:

- Masaüstünde altı kompakt sekme olarak kalır.
- Mobilde etiketli bir `select` kontrolüne dönüşür.
- Senaryo adı yanında kısa bir amaç cümlesi gösterilir.

Girdi yapısı:

- Temel alanlar senaryoya göre seçilir ve ilk görünümde gösterilir.
- Sıfır değerli veya senaryoyla ilgisiz alanlar varsayılan görünümden çıkarılır.
- Kalan alanlar `Gelişmiş kullanım ayarları` ayrıntısında bulunur.
- Değer değişiklikleri mevcut davranış gibi canlı hesaplamayı sürdürür.
- `Hesaplamayı güncelle` düğmesi kaldırılmaz; doğrulama ve klavye akışı için açık bir uygulama eylemi olarak kalır.
- `Varsayılan değerlere dön` ikincil ve daha az baskın görünür.

Modelleme kapsamı, uzun açıklama yerine kısa bir `Bu tahmine dahil` ve `Dahil değil` özeti olarak iki grupta sunulur.

### 6.3 Karar özeti

Karşılaştırılabilir sağlayıcılar arasından en fazla ilk üç sonuç görünür.

Her sonuç satırı/kartı şunları içerir:

- Sağlayıcı kimliği ve adı.
- Tahmini aylık toplam.
- Birinci veya ikinci fiyat etiketi.
- Fiyat farkı: en düşük sonuca göre USD ve yüzde.
- Kullanılan bölge veya bölgeler.
- Veri güncelliği.
- Kapsam durumu.
- En büyük maliyet kalemi.
- `Ayrıntıları göster` eylemi.

En düşük fiyat otomatik olarak `önerilen` diye adlandırılmaz. Başlık `En düşük doğrulanmış tahmin` olur; operasyonel uygunluğun fiyattan ayrı olduğu korunur.

Karşılaştırılamayan sağlayıcılar, `Eksik kanıt veya kapsam` başlıklı kapalı bir bölümde listelenir. Her satır yalnız sağlayıcı adı ve eksik kategori/boyut özetini gösterir.

### 6.4 Yan yana karşılaştırma

Kullanıcı en fazla dört sağlayıcı seçebilir. Varsayılan seçim, karşılaştırılabilir ilk üç sonuçtur.

Karşılaştırma görünümü şu satırları içerir:

- Aylık toplam.
- En büyük maliyet kalemi.
- Bölge.
- Kapsam yeterliliği.
- Ücretsiz katman etkisi.
- Türkiye'den satın alma durumu.
- Hariç tutulan kritik maliyetler.
- Son doğrulama.

Masaüstünde sağlayıcılar sütun, ölçütler satır olarak gösterilir. Mobilde her ölçüt yatay sağlayıcı şeridine dönüşmez; seçili sağlayıcılar iki sütunlu karşılaştırma kartları halinde sırayla gösterilir.

Karşılaştırma seçimi yalnız yerel React durumunda yaşar; kalıcı depolama veya hesap gerektirmez.

### 6.5 Teklif ayrıntıları

Mevcut tablo korunur fakat şu şekilde sadeleştirilir:

- Varsayılan görünüm yalnız seçili senaryonun gerekli kategorilerini içerir.
- İlk görünür sütunlar: sağlayıcı, servis, bölge, kapasite, modellenen tutar ve durum.
- Birim fiyat, ücretsiz kota, trafik, kapsam/hariçler ve kaynaklar satır ayrıntısında gösterilir.
- Sıralama sağlayıcı, servis ve modellenen tutarda devam eder.
- Filtreler tek bir `Filtreler` açılır panelinde gruplanır.
- Etkin filtre sayısı panel başlığında görünür.
- `Tümünü temizle` ve `Senaryoya dön` eylemleri eklenir.
- Bölge filtresi sağlayıcı altında gruplanır; uzun ve tek düzeyli buton listesi kaldırılır.

Masaüstünde yoğun tablo davranışı korunur. Mobilde altı temel sütun için yatay kaydırma devam eder; görünür gölge/fade ve `Tabloyu yatay kaydırın` açıklaması kaydırılabilirliği bildirir.

### 6.6 Ücretsiz kullanım rehberi

İlk görünüm sağlayıcı bazlı özet kartlarıdır. Her kart şunları gösterir:

- Teklif sayısı.
- Yeni hesap kredisi olup olmadığı.
- Sürekli ücretsiz kota olup olmadığı.
- Süreli tekliflerin en uzun süresi.
- Aşımda otomatik ücret riski.
- Son doğrulama.

Kart seçildiğinde o sağlayıcının kayıtları açılır. Kayıt satırlarında ilk sırada `Tür`, `Süre`, `Kota` ve `Aşım davranışı` bulunur. Uygunluk, otomatik ücret notu ve kaynak ayrıntıda yer alır.

Ücretsiz katman değerleri mevcut fiyat sıralamasına otomatik uygulanmıyorsa arayüz bunu açıkça `Bilgi amaçlı; tahmine uygulanmadı` olarak belirtir.

### 6.7 Sağlayıcı ayrıntıları

Sekiz sağlayıcının tamamı açık uzun liste olarak gösterilmez.

- Sağlayıcılar kompakt bir seçim/accordion listesinde sunulur.
- İlk durumda yalnız seçili karşılaştırma sağlayıcıları açık olabilir.
- Gerçek marka işaretleri kullanılır; metin kısaltmaları marka görseli gibi sunulmaz.
- Güçlü yön, sınırlama, bölge ve Türkiye'den satın alma bilgileri aynı başlık düzenini kullanır.
- Resmî site, ödeme kaynağı ve bölge kaynakları tek bir `Kaynaklar` alanında gruplanır.

### 6.8 Metodoloji

Metodoloji beş kısa ilke ve açılır ayrıntılar şeklinde korunur:

- 730 saat / ay.
- Vergiler hariç USD.
- Özgün para birimi ve ECB.
- 30 günlük güncellik.
- Tarihli resmî kaynak.

`Karşılaştırma sınırları` bölümü ayrı ve görünür kalır. FOCUS uyumluluğu iddia edilmez; yalnız tasarımın liste fiyatı, taahhüt ve veri kalitesi kavramlarını açık ayırdığı belirtilir.

## 7. Görsel sistem

### 7.1 Renk

Mevcut lacivert ve mavi kimlik korunur. Yeni token düzeni:

- Koyu zemin: hero ve yüksek güven alanları.
- Beyaz yüzey: hesaplama, sonuç ve veri bölgeleri.
- Açık mavi yüzey: seçili, bilgi ve kapsam durumları.
- Yeşil: yalnız güncel/doğrulanmış durum.
- Turuncu: yeniden doğrulama veya koşullu uygunluk.
- Kırmızı: geçersiz, eksik veya hesaplanamayan durum.

Renk hiçbir durumda tek durum sinyali olmaz; metin ve ikonla birlikte kullanılır.

### 7.2 Tipografi

- Sistem font yığını korunur; yeni web fontu eklenmez.
- Fiyat ve sayısal ölçüler tabular rakam kullanır.
- Ana sonuç fiyatı, sağlayıcı adından daha güçlü fakat sayfa başlığından daha küçük olur.
- Yardımcı metin masaüstünde en az 13 px, mobilde en az 14 px hedefler.
- Uzun kaynak ve kapsam metinleri 65–75 karakterlik okunabilir satır uzunluğunda tutulur.

### 7.3 Yüzey ve yoğunluk

- Kartlar yalnız bağımsız karar birimleri için kullanılır.
- Dekoratif kart yığınlarından kaçınılır.
- Köşe yarıçapları 8–12 px aralığında, çizgiler düşük kontrastlı ve tutarlı olur.
- Bölüm aralıkları masaüstünde 56–72 px, mobilde 40–56 px olur.
- İlk masaüstü görünümde hero, senaryo seçimi ve en az bir sonuç görünmelidir.

### 7.4 İkon ve marka varlıkları

- Eylem ve durum ikonlarında tek bir uyumlu çizgi ikon ailesi kullanılır.
- Sağlayıcı kimlikleri için doğrulanmış, gerçek marka SVG'leri kullanılır.
- Metin karakteri, emoji, CSS çizimi veya elle yaklaşık çizilmiş SVG kullanılmaz.
- İkonların tüm bilgi anlamları görünür metin veya erişilebilir adla desteklenir.

## 8. Etkileşim davranışı

- Senaryo değişince girdi değerleri, sonuçlar ve karşılaştırma seçimi birlikte güncellenir.
- Kullanıcının elle değiştirdiği değerler mevcut canlı güncelleme davranışını korur.
- Filtre değişikliği yalnız teklif ayrıntılarını etkiler; üst karar özeti senaryo kapsamını ve sağlayıcı/bölge seçimini kullanmaya devam eder.
- Açılır ayrıntılar native `details/summary` veya eşdeğer erişilebilir düğme/bölge ilişkisiyle uygulanır.
- Bağlantılı anchor navigasyonu doğru scroll margin kullanır.
- Yeni görünüm değişiklikleri 150–220 ms arası kısa geçişler kullanabilir.
- `prefers-reduced-motion` altında gereksiz animasyon kaldırılır.

## 9. Boş, hata ve belirsizlik durumları

### Karşılaştırılabilir sonuç yok

- Başlık: `Bu senaryo için eksiksiz tahmin bulunamadı`
- Açıklama: eksik kategori/boyutlar ve olası düzeltme yolu.
- Eylem: `Eksik sonuçları incele`.

### Seçili filtreye uygun teklif yok

- Hangi filtrelerin sonucu daralttığı gösterilir.
- `Filtreleri temizle` eylemi sunulur.

### Eski veri

- Eski kayıt varsayılan sıralamaya girmez.
- Kullanıcı açıkça dahil ederse sonuç `Yeniden doğrulanmalı` etiketi ve tarih ile gösterilir.

### Katalog yüklenemedi

- Mevcut tam sayfa hata durumu korunur.
- Hata mesajı teknik olmayan, eyleme dönük bir dille gösterilir.

## 10. Erişilebilirlik gereksinimleri

- Başlık sırası ve landmark yapısı korunur; her bölüm tek ve açık bir erişilebilir ada sahip olur.
- Masaüstü senaryo sekmeleri ok tuşları, Home ve End desteğini korur.
- Mobil senaryo `select` kontrolü görünür etikete sahip olur.
- Tüm dokunma hedefleri en az 44×44 CSS px olur.
- Klavye odağı açık ve 3:1 çevre kontrastına sahip olur.
- Normal metin ve büyük metin renkleri WCAG 2.2 AA kontrast hedeflerini karşılar.
- Durum değişiklikleri uygun `aria-live` bölgesiyle duyurulur; her küçük girdi vuruşunda aşırı duyuru yapılmaz.
- Yatay kaydırılabilir tablo klavyeyle odaklanabilir, açıklayıcı etikete sahip ve görsel kaydırma ipucu içerir.
- Grafik yalnız dekoratif olmayacaktır; bu sürümde yeni grafik eklenmesi zorunlu değildir.
- Renk, sıralama ve rozetler tek başına anlam taşımaz.

## 11. Responsive sözleşme

### 1200 px ve üzeri

- İçerik genişliği en fazla yaklaşık 1440 px.
- Senaryo ve sonuç iki sütun.
- İlk üç sonuç tek görünüm içinde.
- Yan yana karşılaştırma dört sağlayıcıya kadar.

### 700–1199 px

- Senaryo ve sonuç gerekirse tek sütuna düşer.
- Sonuç kartları iki sütun veya yoğun liste olabilir.
- Karşılaştırma iki sağlayıcıyı yan yana gösterir.

### 320–699 px

- Tek sütun.
- Senaryo sekmeleri yerine görünür seçim kontrolü.
- Girdi alanları 320–479 px aralığında tek sütun olur; 480 px üzerinde ancak etiket ve birimler kırpılmadan sığıyorsa iki sütuna çıkar.
- Sonuçlar fiyat ve güven sinyalleriyle kompakt liste olur.
- Uzun tablolar ana akışın dışında ve açık kaydırma işaretiyle sunulur.
- Sağlayıcı karşılaştırması iki kartlık gruplar halinde akar.

## 12. Uygulama sınırları ve bileşen yapısı

Mevcut hesaplama ve veri modülleri korunacaktır. Değişiklik ağırlığı sunum ve görünüm durumundadır.

Öngörülen bileşen sınırları:

- `Hero`: başlık, eylemler ve veri güven bandı.
- `ScenarioCalculator`: senaryo ve temel/gelişmiş kullanım girdileri.
- `DecisionSummary`: ilk üç karşılaştırılabilir sonuç ve eksik sonuç grubu.
- `ProviderCompare`: en fazla dört seçili sağlayıcının ölçüt karşılaştırması.
- `OfferExplorer`: daraltılmış tablo, filtre paneli ve satır ayrıntısı.
- `FreeTierGuide`: sağlayıcı özetleri ve ayrıntı kayıtları.
- `ProviderDetails`: seçilebilir/accordion sağlayıcı bilgisi.
- `Methodology`: kısa ilkeler ve sınırlar.
- `TrustSignal`: güncellik, kapsam ve fiyat tabanı için yeniden kullanılabilir durum sunumu.

`ScenarioSummary` ve `ComparisonTable` tek seferde silinmez. Davranışları testlerle korunarak yeni bileşenlere bölünür veya yeniden adlandırılır.

## 13. Test ve kabul ölçütleri

### Otomatik testler

- Mevcut fiyatlama, sıralama, veri doğrulama ve fail-closed testleri aynen geçer.
- Senaryo değişimi, temel ve gelişmiş girdi davranışı test edilir.
- İlk üç sonuç ve eksik sonuç grubunun ayrımı test edilir.
- Sağlayıcı seçim sınırı ve karşılaştırma güncellemesi test edilir.
- Ücretsiz katman `tahmine uygulanmadı` durumu test edilir.
- Filtre sayısı, filtre temizleme ve senaryoya dönme davranışları test edilir.
- Mobil senaryo seçimi ve masaüstü klavye sekme davranışı test edilir.
- Katalog yükleme hata durumu korunur.

### Görsel ve tarayıcı doğrulaması

- 1440×1000 masaüstü, 768×1024 tablet ve 390×844 mobil görünüm kontrol edilir.
- İlk görünüm dengesi, taşma, satır kırılması ve kaynak/marka varlıkları incelenir.
- Temel akış: senaryo seç → kullanım değiştir → ilk sonucu anla → iki sağlayıcı karşılaştır → teklif ayrıntısını aç → resmî kaynağa ulaş.
- Klavye akışı ve görünür odak kontrol edilir.
- Yatay tablo davranışı ve kaydırma ipucu doğrulanır.
- Azaltılmış hareket tercihi doğrulanır.
- Tarayıcı konsolunda hata veya uyarı kalmaz.

### Başarı ölçütleri

- Masaüstünde ilk doğrulanmış sonuç başlangıç görünümünde veya tek kısa kaydırma içinde görünür.
- Mobilde ilk sonuç, senaryo formunun hemen ardından gelir.
- Varsayılan ana akışta 41 teklif satırının tamamı render edilmez.
- Karşılaştırılamayan sağlayıcılar doğrulanmış fiyat sonuçlarıyla aynı listede eşit ağırlıkta gösterilmez.
- Ücretsiz katmanda süre ve otomatik ücret riski yatay kaydırma gerektirmeden anlaşılır.
- Kullanıcı herhangi bir fiyatın kaynağına en fazla iki ayrıntı açma eylemiyle ulaşabilir.
- Hiçbir mevcut veri doğruluğu veya kaynak bütünlüğü güvencesi zayıflatılmaz.

## 14. Kapsam dışı gelişmeler

Bu yenilemede aşağıdakiler yapılmaz:

- FOCUS uyumlu fatura veya maliyet kullanım dosyası içe aktarma.
- Kurumsal indirim veya taahhüt hesabı.
- Kullanıcıya özel geçmiş kullanım veya kaydedilmiş tahmin.
- Oturum açma, paylaşım bağlantısı veya sunucu veritabanı.
- Maliyet tahmini dışa aktarma.
- Karbon tahmini veya operasyonel kalite için sayısal birleşik puan.
- Yeni sağlayıcı veya servis kategorisi ekleme.
- Fiyat ve ücretsiz katman verisini otomatik yenileme.

Bu özellikler daha sonra ayrı tasarım ve veri modeli çalışmaları olarak ele alınabilir.

## 15. Güncel tasarım dayanakları

Yenileme aşağıdaki güncel, birincil kaynaklardan alınan yönlerle uyumludur:

- [FOCUS 1.4](https://focus.finops.org/what-is-focus/): liste maliyeti, fatura anatomisi, taahhüt uygunluğu ve veri bütünlüğünün ayrı kavramlar olarak ele alınması.
- [FOCUS 1.5 yayın kapsamı](https://focus.finops.org/focus-1-5-release-scope/): henüz yayımlanmamış SKU fiyat kataloğu ve AI model kimliği çalışmalarına veri modeli genişletme alanı bırakılması; mevcut üründe uyumluluk iddiası yapılmaması.
- [FinOps Planning & Estimating](https://www.finops.org/framework/capabilities/planning-estimating/): senaryo kapsamı, varsayımlar, veri kalitesi ve güven düzeyinin tahmin sonucuyla birlikte sunulması.
- [Microsoft Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/), [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator) ve [AWS Pricing Calculator](https://docs.aws.amazon.com/pricing-calculator/): iş yükü/senaryo tabanlı tahmin, kısa toplam görünümü ve isteğe bağlı maliyet ayrıntısı yaklaşımı.

Bu kaynaklar ürün kapsamını genişletmek için değil, mevcut tahmin deneyiminin bilgi mimarisini güncellemek için kullanılır.

## 16. Teslimat sınırı

Onay sonrası hazırlanacak uygulama planı yalnız yerel kaynak kodu, testler ve tarayıcı doğrulamasını kapsar. Commit, push, GitHub Actions, Azure Static Web Apps, özel alan adı ve DNS işlemleri ayrıca açıkça yetkilendirilmedikçe yapılmaz.
