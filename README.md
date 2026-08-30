# Bulut sağlayıcı maliyet karşılaştırması

`cld-aserdargun-com`, Türkiye'den satın alınabilen genel kullanıma açık bulut servislerini resmî kaynaklara dayalı, vergiler hariç USD maliyetleriyle karşılaştıran Türkçe bir karar destek uygulamasıdır. Katalog bir satış teklifi ya da satın alma garantisi değildir; tarihli bir araştırma fotoğrafıdır.

## Neler sunar?

- Altı hazır senaryo, görünür kapsam notları ve değiştirilebilir kullanım değerleriyle modellenen aylık tutarlar
- Resmî kaynağa, bölgeye, birime ve doğrulama tarihine bağlı USD karşılaştırması
- Azure ve Google Cloud odaklı; AWS ve Oracle Cloud'u da kapsayan ücretsiz katman görünümü
- Karşılaştırılabilir ve eksiksiz sonuçlarda en düşük ve ikinci en düşük fiyat etiketleri
- Sağlayıcı, kategori, bölge, ücretsiz kota ve güncellik filtreleri
- 30 günlük güncellik durumu; eksik/geçersiz değerleri sıfır ya da sıralanabilir fiyat kabul etmeyen veri sağlığı yaklaşımı

## Karar akışı

- Hazır senaryolardan iş yükünü seçin.
- Temel kullanım değerlerini ayarlayın; gerekirse gelişmiş kullanım ayarlarını açın.
- Karşılaştırılabilir ilk üç sonucu, fiyat farklarını ve veri güven sinyallerini okuyun.
- Seçtiğiniz sağlayıcıları yan yana karşılaştırın.
- Ayrıntılı teklif tablosunu yalnız gerektiğinde açın.
- Ücretsiz kullanım rehberinde süre, uygunluk ve aşım risklerini inceleyin.
- Satın almadan önce teklif, sağlayıcı ve metodoloji bölümlerindeki resmî kaynakları izleyin.

Ücretsiz katmanlar, kullanıcı uygunluğu açıkça seçilip hesaplamaya uygulanmadıkça yalnızca bilgi amaçlıdır. Arayüzde gösterilen toplamlar vergiler hariç genel liste fiyatı tahminleridir; taahhüt, sözleşme indirimi, destek ve lisans maliyetlerini içermez.

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

Gereksinimler: Node.js 22.12 veya üzeri ve npm 10.9.8.

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

Codex proje aksiyonları aynı repo komutlarına bağlıdır:

```bash
npm run dev:codex       # http://127.0.0.1:4173
npm run validate:codex
npm run stop:codex
```

## Veri yaklaşımı

Katalog çalışma zamanında fiyat API'lerine bağlanmaz. Fiyatlar, ücretsiz katmanlar, bölgeler, satın alma notları ve ECB döviz kuru sürümlü JSON dosyalarında tarihli olarak saklanır. Teknik ve ticari iddialarda yalnız sağlayıcının kendi resmî sayfaları/API'leri ile ECB kaynağı kabul edilir; üçüncü taraf fiyat siteleri kullanılmaz.

Sürekli çalışan işlem kaynakları ayda 730 saat üzerinden hesaplanır. Gösterilen tutarlar tam fatura değil, her senaryonun görünür kapsam notunda sayılan bileşenlerin modellenen aylık tutarıdır; seçilen tekliflerin kapsam ve hariçleri hem sıralama ayrıntılarında hem servis tablosunda gösterilir. Bir teklif senaryonun vCPU, RAM, depolama, trafik veya GPU VRAM gereksinimini karşılamıyorsa ayrıntılı tabloda kaynak fiyatı korunur fakat modellenen tutar üretilmez. Bölge filtresi teklif havuzunu hem sıralamada hem ayrıntılı tabloda birlikte daraltır; gerekli bir bölge kapatıldığında sağlayıcı seçili kalsa bile sonuç eksik ve doğrulanamaz olabilir. EUR fiyatlar özgün para birimi ve aylık üst sınırıyla korunur, geçerli tarihli ECB EUR→USD referans kuru ile çevrilir ve kur tarihi arayüzde gösterilir. Bir kayıt 30 günden eskiyse yeniden doğrulanmalı olarak işaretlenir. Eksik ya da yanlış sağlayıcıya/türe bağlı kaynak, eksik kur veya geçersiz fiyat hiçbir zaman `0 USD` sayılmaz ve sıralamaya girmez.

Ayrıntılar için [fiyat metodolojisini](docs/methodology.md) ve [veri güncelleme rehberini](docs/updating-data.md) okuyun.

## Yayın

`main` dalındaki doğrulanmış statik `dist/` çıktısı GitHub Actions ile Free Azure Static Web Apps kaynağına dağıtılır. Azure tarafından üretilen adres `https://black-field-04b19f003.7.azurestaticapps.net`, özel alan adı ise `https://cld.aserdargun.com` adresidir. Üretim workflow'u derleme öncesinde kilitli bağımlılık kurulumunu, kalite kontrollerini, katalog doğrulamasını, statik artefakt kontrolünü ve Playwright testlerini yeniden çalıştırır.

## Uyarı

Fiyatlar ve uygunluk koşulları sağlayıcılar tarafından değiştirilebilir. Son satın alma kararından önce arayüzdeki resmî kaynak, bölge, ölçüm birimi, doğrulama tarihi ve hariç tutulan bileşenler yeniden kontrol edilmelidir.
