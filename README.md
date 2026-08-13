# Bulut sağlayıcı maliyet karşılaştırması

`cld-aserdargun-com`, Türkiye'den satın alınabilen genel kullanıma açık bulut servislerini resmî kaynaklara dayalı, vergiler hariç USD maliyetleriyle karşılaştıran Türkçe bir karar destek uygulamasıdır. Katalog bir satış teklifi ya da satın alma garantisi değildir; tarihli bir araştırma fotoğrafıdır.

## Neler sunar?

- Altı hazır senaryo ve değiştirilebilir kullanım değerleriyle aylık maliyet hesaplayıcı
- Resmî kaynağa, bölgeye, birime ve doğrulama tarihine bağlı USD karşılaştırması
- Azure ve Google Cloud odaklı; AWS ve Oracle Cloud'u da kapsayan ücretsiz katman görünümü
- Karşılaştırılabilir ve eksiksiz sonuçlarda en düşük ve ikinci en düşük fiyat etiketleri
- Sağlayıcı, kategori, bölge, ücretsiz kota ve güncellik filtreleri
- 30 günlük güncellik durumu; eksik/geçersiz değerleri sıfır ya da sıralanabilir fiyat kabul etmeyen veri sağlığı yaklaşımı

## Kapsam

Sağlayıcılar: **Azure, Google Cloud, AWS, Hetzner, Oracle Cloud, Cloudflare, DigitalOcean ve Vultr**.

Servis kategorileri:

- Hesaplama
- AI / GPU
- Nesne depolama
- Yönetilen veritabanı
- Sunucusuz
- CDN / ağ
- Kubernetes

Hazır senaryolar:

- Küçük web uygulaması
- API arka ucu
- Veritabanlı SaaS
- Statik site
- Yapay zeka GPU
- Yüksek trafikli uygulama

Kapsam, Türkiye'den bireysel veya kurumsal hesapla erişilebilen genel teklifler ve İstanbul'a görece yakın Avrupa bölgeleri üzerine kuruludur. Türkiye uygunluğu, araştırma tarihinde hesap açma ve ödeme yöntemlerine ilişkin resmî kanıt bulunması anlamına gelir; sağlayıcının hesabı kabul edeceğini, belirli bir bölgede kapasite bulunacağını veya ödemenin tamamlanacağını garanti etmez. Koşullu sağlayıcılarda Türkiye'ye özgü açık garanti yoktur.

Tüm karşılaştırmalar USD olarak gösterilir ve vergileri içermez. Kart/ödeme kuruluşu kur farkı, ödeme ücreti, destek planı, lisans, ek disk/IP, yedekleme ve teklif notlarında hariç bırakılan diğer fatura kalemleri gerçek maliyeti değiştirebilir.

## Yerelde çalıştırma

Gereksinimler: Node.js 24 ve npm.

```bash
npm ci
npm run dev
```

Kalite ve tarayıcı kontrolleri:

```bash
npm run check
npm run e2e
```

`npm run check`; kod kalitesi, birim/bileşen testleri, katalog doğrulaması ve üretim derlemesini birlikte çalıştırır.

## Veri yaklaşımı

Katalog çalışma zamanında fiyat API'lerine bağlanmaz. Fiyatlar, ücretsiz katmanlar, bölgeler, satın alma notları ve ECB döviz kuru sürümlü JSON dosyalarında tarihli olarak saklanır. Teknik ve ticari iddialarda yalnız sağlayıcının kendi resmî sayfaları/API'leri ile ECB kaynağı kabul edilir; üçüncü taraf fiyat siteleri kullanılmaz.

Sürekli çalışan işlem kaynakları ayda 730 saat üzerinden hesaplanır. EUR fiyatlar özgün para birimi ve aylık üst sınırıyla korunur, geçerli tarihli ECB EUR→USD referans kuru ile çevrilir ve kur tarihi arayüzde gösterilir. Bir kayıt 30 günden eskiyse yeniden doğrulanmalı olarak işaretlenir. Eksik kaynak, eksik kur veya geçersiz fiyat hiçbir zaman `0 USD` sayılmaz ve sıralamaya girmez.

Ayrıntılar için [fiyat metodolojisini](docs/methodology.md) ve [veri güncelleme rehberini](docs/updating-data.md) okuyun.

## Yayın sınırı

Bu depo Azure'a, `cld.aserdargun.com` alan adına, GitHub Pages'a veya başka bir ortama dağıtım yapmaz. Çalışma bilerek GitHub tesliminde durdurulmuştur; CI yalnız kalite kontrolleri çalıştırır ve bulut girişi ya da dağıtım adımı içermez.

## Uyarı

Fiyatlar ve uygunluk koşulları sağlayıcılar tarafından değiştirilebilir. Son satın alma kararından önce arayüzdeki resmî kaynak, bölge, ölçüm birimi, doğrulama tarihi ve hariç tutulan bileşenler yeniden kontrol edilmelidir.
