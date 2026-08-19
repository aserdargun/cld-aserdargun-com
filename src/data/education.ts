import type { ServiceCategory } from '../domain/catalog'

/**
 * Eğitim içerikleri.
 *
 * Uygulama genelinde gösterilen kavramsal kartlar, görsel diyagramlar,
 * fiyatlandırma modelleri, sağlayıcı özetleri, sözlük ve bilgi testi için
 * tip-güvenli içerik kaynağı. Tüm metinler Türkçe ve üniversite öğrencisi
 * seviyesinde sade bir dille yazılmıştır.
 */

export interface ConceptLayer {
  id: 'iaas' | 'paas' | 'saas' | 'on-prem'
  title: string
  shortLabel: string
  whoManages: string
  example: string
  /** Sorumluluk payı diyagramı için 0-100 arası kullanıcı sorumluluk oranı */
  userResponsibility: number
}

export const conceptLayers: readonly ConceptLayer[] = [
  {
    id: 'on-prem',
    title: 'Kendi sunucun (On-Premises)',
    shortLabel: 'On-prem',
    whoManages: 'Her şeyi sen: sunucu, elektrik, soğutma, ağ, işletim sistemi, yedekleme.',
    example: 'Okulun bilgisayar laboratuvarı, kendi ofisindeki sunucu.',
    userResponsibility: 100,
  },
  {
    id: 'iaas',
    title: 'IaaS — Altyapı hizmeti',
    shortLabel: 'IaaS',
    whoManages: 'Sağlayıcı donanım ve veri merkezini yönetir; sen işletim sistemi, ağ ve uygulamayı kurarsın.',
    example: 'Azure VM, EC2, Google Compute Engine.',
    userResponsibility: 70,
  },
  {
    id: 'paas',
    title: 'PaaS — Platform hizmeti',
    shortLabel: 'PaaS',
    whoManages: 'Sağlayıcı işletim sistemi, çalışma zamanı ve veritabanı motorunu yönetir; sen sadece kodu yazarsın.',
    example: 'Azure App Service, App Engine, Heroku, Vercel.',
    userResponsibility: 30,
  },
  {
    id: 'saas',
    title: 'SaaS — Yazılım hizmeti',
    shortLabel: 'SaaS',
    whoManages: 'Her şeyi sağlayıcı yönetir; sen sadece kullanırsın.',
    example: 'Gmail, Microsoft 365, Slack, Dropbox.',
    userResponsibility: 5,
  },
] as const

export interface ServiceCategoryLesson {
  category: ServiceCategory
  title: string
  oneLiner: string
  whatIsIt: string
  whenToUse: string
  analogy: string
  keyTerms: readonly string[]
  commonMistake: string
}

export const serviceCategoryLessons: readonly ServiceCategoryLesson[] = [
  {
    category: 'compute',
    title: 'Hesaplama (Compute)',
    oneLiner: 'Sanal makine (VM) ile çalışan genel amaçlı işlemci gücü.',
    whatIsIt:
      'Bir işletim sistemi ve CPU/RAM ayırdığın, uzaktan yönettiğin bir bilgisayar olarak düşün. vCPU ve RAM seçtikçe fiyat yükselir; 730 saat/ay genelde ay boyunca açık kalmanın fiyatıdır.',
    whenToUse:
      '7/24 ayakta kalması gereken web siteleri, API servisleri, oyun sunucuları, kurumsal uygulamalar için idealdir.',
    analogy: 'Kendi dairen: senin yönetimin, sağlayıcı sadece binayı ve elektriği sağlıyor.',
    keyTerms: ['vCPU', 'RAM', 'örnek türü (instance type)', 'bölge (region)', 'aylık 730 saat'],
    commonMistake:
      'Sadece CPU ve RAM seçip trafiği (egress) unutmak: dışarıya veri göndermek ayrıca ücretlendirilir.',
  },
  {
    category: 'object-storage',
    title: 'Nesne Depolama (Object Storage)',
    oneLiner: 'Dosyalarını (resim, video, yedek, log) sınırsız ölçekte tutan servistir.',
    whatIsIt:
      'Klasik bir disk gibi düşün ama dosyalarını "obje" olarak yazarsın. S3, Azure Blob, GCS gibi servisler buna örnektir. GB başına aylık ücret vardır; okuma/yazma istekleri de küçük bir ek getirir.',
    whenToUse:
      'Statik site dosyaları, yedeklemeler, kullanıcı yüklediği medya, log arşivi, büyük veri setleri için uygundur.',
    analogy: 'Kiralık depo: ay başına m³ başına para ödersin, istediğin zaman erişirsin.',
    keyTerms: ['bucket / kova', 'GB/ay', 'erişim sınıfı (hot/cool/archive)', 'istek başına ücret'],
    commonMistake:
      'Sık erişilen veriyi arşiv katmanına koymak: okuma ücreti aylık tasarrufunu geçebilir.',
  },
  {
    category: 'managed-database',
    title: 'Yönetilen Veritabanı',
    oneLiner: 'Sağlayıcının sana kurduğu, yedeklediği ve güncellediği veritabanı motorudur.',
    whatIsIt:
      'PostgreSQL, MySQL, MongoDB gibi bir veritabanını kendın kurmak yerine sağlayıcıya bırakırsın. Sağlayıcı yedek alır, yama yapar, çoğaltır (replication). Saatlik veya aylık ücret ile depolama ve IOPS ayrıca faturalanır.',
    whenToUse:
      'Veri bütünlüğü kritik uygulamalar, e-ticaret, kullanıcı hesapları, transaksiyonel iş yükleri için idealdir.',
    analogy: 'Profesyonel bir aşçı tutmak: sen malzemeyi söylersin, aşçı yemeği yapar, servisi de o yapar.',
    keyTerms: ['saatlik örnek', 'depolama GB/ay', 'IOPS', 'yedekleme penceresi', 'çoklu bölge (HA)'],
    commonMistake:
      'Sadece saatlik ücrete bakıp IOPS ve yedekleme boyutunu hesaba katmamak: gerçek fatura bunların üstünde büyür.',
  },
  {
    category: 'serverless',
    title: 'Sunucusuz (Serverless)',
    oneLiner: 'Sadece kodunu yazarsın; kaynak yalnızca çalıştığı saniye/istek için ücretlenir.',
    whatIsIt:
      'Lambda, Cloud Functions, Azure Functions gibi servislerle çalışır. Sunucu yok, ölçeklendirme otomatik, boşta iken fatura gelmez. Faturalama istek sayısı ve yürütme süresi (GB-saniye) üzerinden olur.',
    whenToUse:
      'Anlık tetiklenen işler: bir resmi dönüştürmek, webhook karşılamak, planlanmış cron görevi, düşük trafiğe sahip API uçları.',
    analogy: 'Taksi: sadece bindiğin dakika ve gidilen mesafe için ödeme, garaj yok.',
    keyTerms: ['istek sayısı', 'GB-saniye', 'soğuk başlangıç (cold start)', 'eşzamanlılık (concurrency)'],
    commonMistake:
      'Sürekli akan yüksek trafik için kullanmak: klasik VM daha ucuz olabilir, çünkü sunucusuz milyon istek üstünde pahalılayabilir.',
  },
  {
    category: 'cdn-network',
    title: 'CDN ve Ağ',
    oneLiner: 'İçeriğini dünyadaki uç noktalara dağıtıp son kullanıcıya en yakın yerden servis eder.',
    whatIsIt:
      'CloudFront, Cloudflare, Azure CDN gibi servisler statik veya önbelleklenebilir içeriği kullanıcıya yakın sunucudan verir. Çıkış trafiği (egress, GB) genelde en büyük fatura kalemidir.',
    whenToUse:
      'Statik site, video yayını, yazılım indirme, global kullanıcı tabanı olan her uygulama için idealdir.',
    analogy: 'Bir kitabı şehirdeki tüm kütüphanelere göndermek: kullanıcı en yakın kütüphaneden alır.',
    keyTerms: ['egress GB', 'önbellek isabet oranı', 'origin shield', 'TLS/SSL', 'WAF'],
    commonMistake:
      'Tüm trafiği origin\'e gönderip CDN\'in önbelleğini atlamak: hem maliyet hem gecikme artar.',
  },
  {
    category: 'kubernetes',
    title: 'Kubernetes (Konteyner Orkestrasyonu)',
    oneLiner: 'Konteynerlerini (Docker) otomatik ölçekleyen, dağıtan ve iyileştiren kontrol düzlemi.',
    whatIsIt:
      'EKS, AKS, GKE gibi yönetilen Kubernetes servisleri, sen sadece uygulamanı konteyner olarak gönderirsin; sağlayıcı kontrol düzlemini (control plane) yönetir. Faturalama kontrol düzlemi ücreti + çalışan düğüm (worker node) saatleridir.',
    whenToUse:
      'Mikroservis mimarisi, sık güncellenen uygulamalar, taşınabilir (portable) altyapı isteyen ekipler için uygundur.',
    analogy: 'Bir orkestranın şefi: hangi enstrüman ne zaman çalacak, sen söylersin; şef partiyi yönetir.',
    keyTerms: ['düğüm (node)', 'kontrol düzlemi', 'pod', 'servis', 'ölçekleyici (HPA)'],
    commonMistake:
      'Küçük bir uygulama için Kubernetes kurmak: yönetim yükü, maliyetin önüne geçer; tek bir VM daha verimli olabilir.',
  },
  {
    category: 'gpu-ai',
    title: 'AI / GPU',
    oneLiner: 'Yapay zeka model eğitimi ve çıkarımı için GPU gücü.',
    whatIsIt:
      'NVIDIA H100, A100, L4 gibi GPU’ları saatlik veya aylık kiralarsın. VRAM (GB) ve saat, fiyatı belirleyen iki temel bileşendir. Eğitim (training) saatleri çıkarımdan (inference) çok daha pahalıdır.',
    whenToUse:
      'Derin öğrenme modeli eğitimi, büyük dil modeli (LLM) ince ayarı, video işleme, bilimsel simülasyon için idealdir.',
    analogy: 'Süper bilgisayara saatlik erişim: sadece ihtiyacın olduğu an için açarsın.',
    keyTerms: ['GPU saati', 'VRAM', 'eğitim vs çıkarım', 'NVIDIA CUDA', 'kuyruk (queue)'],
    commonMistake:
      'Modeli GPU’da 7/24 çalışır bırakmak: çıkarım genelde küçük örneklerde veya sunucusuz GPU ile daha ucuzdur.',
  },
] as const

export interface PricingModel {
  id: 'on-demand' | 'reserved' | 'spot' | 'free-tier' | 'savings-plan'
  title: string
  oneLiner: string
  pros: string
  cons: string
  bestFor: string
  /** Görsel bar üzerinde 0-100 göreli tasarruf oranı */
  savingsHint: number
}

export const pricingModels: readonly PricingModel[] = [
  {
    id: 'on-demand',
    title: 'İsteğe bağlı (On-demand)',
    oneLiner: 'Saniye/saat bazında, taahhütsüz faturalandırma.',
    pros: 'İstediğin an açıp kapatabilirsin; taahhüt yok, esnek.',
    cons: 'En pahalı seçenek; uzun süreli çalıştırmada maliyet şişer.',
    bestFor: 'Kısa süreli testler, ödev/proje, değişken iş yükü.',
    savingsHint: 0,
  },
  {
    id: 'reserved',
    title: 'Rezerve / Taahhütlü (Reserved)',
    oneLiner: '1 veya 3 yıl taahhüt vererek %30-60 arası indirim alırsın.',
    pros: 'En yüksek indirim; bütçe planlaması kolaylaşır.',
    cons: 'Taahhüt süresi boyunca ödeme devam eder; erken iptal varsa ceza olabilir.',
    bestFor: '7/24 çalışacak, ölçeği bilinen üretim iş yükleri.',
    savingsHint: 60,
  },
  {
    id: 'spot',
    title: 'Spot (Açık artırma / kalan kapasite)',
    oneLiner: 'Sağlayıcının boş kalan kapasitesini çok ucuza alırsın; her an geri alınabilir.',
    pros: 'On-demand’a göre %60-90 daha ucuz olabilir.',
    cons: 'Sağlayıcı 2 dakika uyarıyla kapasiteyi geri alabilir; hata toleransı şart.',
    bestFor: 'Toplu iş (batch), simülasyon, kuyruk tabanlı iş yükleri, ML eğitimi.',
    savingsHint: 80,
  },
  {
    id: 'savings-plan',
    title: 'Tasarruf planı (Savings plan)',
    oneLiner: 'Saatlik harcama taahhüdü vererek esnek indirim.',
    pros: 'Rezerve kadar katı değil; örnek tipini değiştirebilirsin.',
    cons: 'Taahhüt edilen saatlik tutarı belirli bir süre aşarsan ek ödeme gelir.',
    bestFor: 'Birden çok servis kullanan, ölçeği yıldan yıla değişen ekipler.',
    savingsHint: 40,
  },
  {
    id: 'free-tier',
    title: 'Ücretsiz katman (Free tier)',
    oneLiner: 'Yeni hesap kredisi veya sürekli küçük bir kota ile bedava başlangıç.',
    pros: 'Kredi bittiğinde otomatik ücret kesilmez (Always Free), öğrenmek için idealdir.',
    cons: 'Kapasite sınırlı; üretim iş yükü için yetersiz kalabilir.',
    bestFor: 'Öğrenciler, küçük yan projeler, prototip ve demolar.',
    savingsHint: 100,
  },
] as const

export interface RegionLesson {
  title: string
  whyItMatters: string
  bulletPoints: readonly string[]
  misconception: string
}

export const regionLesson: RegionLesson = {
  title: 'Bölge (Region) neden önemli?',
  whyItMatters:
    'Verinin fiziksel olarak tutulduğu veri merkezi coğrafyasıdır. Türkiye’den kullanıcıya en yakın bölgeyi seçmek gecikmeyi düşürür; ancak uyumluluk, fiyat ve hizmet kapsamı bölgeye göre değişir.',
  bulletPoints: [
    'Gecikme (latency): İstanbul’a fiziksel olarak yakın bölgeler (Frankfurt, Amsterdam, Batı Avrupa) genelde 30-50 ms civarıdır.',
    'Veri egemenliği: Bazı sektörler verinin belirli bir ülkede kalmasını zorunlu kılar; bu durumda bölgeyi ona göre seçersin.',
    'Fiyat: Aynı VM tipi, bölgeye göre %10-30 farklı fiyatlanabilir.',
    'Hizmet kapsamı: Her yeni servis, önce ABD bölgelerinde açılır; diğer bölgelerde olmayabilir.',
  ],
  misconception:
    '"En yakın bölge her zaman en iyisidir" değil: bazen uzak bölge daha ucuz veya daha yeni özelliklere sahip olabilir.',
}

export interface ProviderSnapshot {
  providerId: string
  oneLiner: string
  forWhom: string
  signature: string
}

export const providerSnapshots: readonly ProviderSnapshot[] = [
  {
    providerId: 'azure',
    oneLiner: 'Microsoft ekosistemiyle iç içe, kurumsal ve hibrit bulut.',
    forWhom: 'Microsoft 365, Active Directory, .NET kullanan ekipler.',
    signature: 'Visual Studio, Entra ID ve Windows Server ile bütünleşik.',
  },
  {
    providerId: 'gcp',
    oneLiner: 'Veri, yapay zeka ve Kubernetes konusunda güçlü, şeffaf fiyatlandırma.',
    forWhom: 'Veri bilimi, ML ve K8s odaklı ekipler.',
    signature: 'BigQuery, Vertex AI ve güçlü Kubernetes motoru (GKE).',
  },
  {
    providerId: 'aws',
    oneLiner: 'En geniş hizmet kataloğu, olgun ekosistem.',
    forWhom: 'Genel amaçlı üretim, startup, kurumsal.',
    signature: 'EC2, S3, Lambda — bulutun "klavuzu".',
  },
  {
    providerId: 'hetzner',
    oneLiner: 'Avrupa merkezli ekonomik bulut, basit saatlik fiyat.',
    forWhom: 'Bütçe hassasiyeti olan öğrenci ve KOBİ projeleri.',
    signature: 'Düşük fiyat, şeffaf üst sınır, sınırlı yönetilen hizmet.',
  },
  {
    providerId: 'oracle',
    oneLiner: 'Cömert Always Free katmanı, Oracle veritabanı ile doğal uyum.',
    forWhom: 'Öğrenciler, Oracle DB kullanan ekipler.',
    signature: 'Sürekli ücretsiz küçük VM + Autonomous DB kotası.',
  },
  {
    providerId: 'cloudflare',
    oneLiner: 'Çıkış ücreti olmayan küresel edge ağı.',
    forWhom: 'Statik site, API, DDoS koruması arayanlar.',
    signature: 'Egress bedava; R2 ve Workers ile sunucusuz ekonomi.',
  },
  {
    providerId: 'digitalocean',
    oneLiner: 'Geliştirici dostu, sade arayüz, öngörülebilir paket fiyatları.',
    forWhom: 'İlk sunucusunu kuran öğrenciler, KOBİ.',
    signature: 'Droplet, App Platform, basit dokümantasyon.',
  },
  {
    providerId: 'vultr',
    oneLiner: 'Çok sayıda bölge, basit saatlik genel amaçlı sunucu.',
    forWhom: 'Konum esnekliği isteyen küçük ekipler.',
    signature: '32+ lokasyon, saatlik faturalama, hazır uygulama imajları.',
  },
] as const

export interface GlossaryTerm {
  term: string
  definition: string
  example: string
}

export const glossary: readonly GlossaryTerm[] = [
  {
    term: 'vCPU',
    definition: 'Sanal işlemci çekirdeği. Genelde 1 fiziksel çekirdeğin 2 iş parçacığına eşdeğerdir.',
    example: '2 vCPU + 4 GB RAM = küçük bir web uygulamasını rahatça çalıştırır.',
  },
  {
    term: 'RAM',
    definition: 'Çalışma anında verilerin tutulduğu bellek. Veritabanı ve önbellek için kritik.',
    example: 'PostgreSQL için GB başına ayrılan RAM, sorgu hızını doğrudan etkiler.',
  },
  {
    term: 'Egress (Çıkış trafiği)',
    definition: 'Buluttan dışarıya gönderilen veri. Genelde GB başına ücretlendirilir.',
    example: 'Sitenin ziyaretçilere gönderdiği resim ve video GB olarak faturalanır.',
  },
  {
    term: 'Ingress (Giriş trafiği)',
    definition: 'Buluta dışarıdan gelen veri. Çoğu sağlayıcıda ücretsizdir.',
    example: 'Kullanıcının yüklediği bir fotoğraf, genelde ek ücret getirmez.',
  },
  {
    term: 'Bölge (Region)',
    definition: 'Verinin fiziksel olarak tutulduğu coğrafi veri merkezi grubu.',
    example: 'westeurope = Hollanda, eu-central-1 = Frankfurt.',
  },
  {
    term: 'Availability Zone (AZ)',
    definition: 'Aynı bölge içindeki bağımsız veri merkezleri. Bir AZ çökerse diğeri hizmeti sürdürür.',
    example: 'Bir uygulamayı 2 farklı AZ’ye dağıtmak, tek nokta arızasını önler.',
  },
  {
    term: 'IOPS',
    definition: 'Saniyedeki okuma/yazma işlemi. Veritabanı ve disk performansı için ölçüt.',
    example: 'Yoğun yazma trafiği olan bir veritabanı için yüksek IOPS seçilir.',
  },
  {
    term: 'SLA',
    definition: 'Hizmet seviyesi anlaşması; sağlayıcının taahhüt ettiği çalışma süresi yüzdesi.',
    example: '%99,99 SLA = yılda en fazla ~52 dakika kesinti.',
  },
  {
    term: 'Konteyner',
    definition: 'Uygulamanın kod, bağımlılık ve yapılandırmasıyla birlikte taşınabilir paketi.',
    example: 'Bir Docker imajı, geliştirici makinesinde de bulutta da aynı şekilde çalışır.',
  },
  {
    term: 'Otomatik ölçekleme',
    definition: 'Yük arttığında yeni örneklerin otomatik açılıp, azaldığında kapanması.',
    example: 'Bir e-ticaret sitesi kampanya günü 3 kat örnek açar, gece 1 örneğe döner.',
  },
  {
    term: 'Spot örnek',
    definition: 'Sağlayıcının boş kapasitesini çok ucuza kiralamak; her an geri alınabilir.',
    example: 'Toplu video dönüştürme işini spot ile yapıp %70 tasarruf etmek.',
  },
  {
    term: 'Ekim (deploy)',
    definition: 'Uygulamanın yeni sürümünün bulut ortamına yüklenip çalıştırılması.',
    example: 'CI/CD pipeline, her Git push’ta otomatik olarak yeni sürümü dağıtır.',
  },
] as const

export type QuizOptionId = 'a' | 'b' | 'c' | 'd'

export interface QuizQuestion {
  id: string
  prompt: string
  options: ReadonlyArray<{ id: QuizOptionId; text: string }>
  correctId: QuizOptionId
  explanation: string
}

export const quizQuestions: readonly QuizQuestion[] = [
  {
    id: 'q-iaas',
    prompt: 'Sanal makine (VM) kiralayıp kendi işletim sistemini sen kurduğunda bu model hangisidir?',
    options: [
      { id: 'a', text: 'SaaS' },
      { id: 'b', text: 'PaaS' },
      { id: 'c', text: 'IaaS' },
      { id: 'd', text: 'On-premises' },
    ],
    correctId: 'c',
    explanation:
      'IaaS’te sağlayıcı donanımı verir, OS ve üstü sana aittir. PaaS’te OS bile sağlayıcıdadır, SaaS’te uygulamayı doğrudan kullanırsın.',
  },
  {
    id: 'q-egress',
    prompt: 'CDN kullanmanın asıl ekonomik faydası nedir?',
    options: [
      { id: 'a', text: 'Egress trafiğini tamamen ücretsiz yapar' },
      { id: 'b', text: 'Origin’den çıkışı azaltır, böylece toplam egress ücreti düşer' },
      { id: 'c', text: 'Veritabanı sorgu sayısını azaltır' },
      { id: 'd', text: 'Disk IOPS’unu sıfırlar' },
    ],
    correctId: 'b',
    explanation:
      'CDN içeriği ucuz edge noktalarından verir; asıl pahalı olan origin’den çıkış azalır. (Cloudflare R2 gibi servislerde egress 0 olabilir, ama genel kural "azaltır"dır.)',
  },
  {
    id: 'q-reserved',
    prompt: '1 yıl taahhütle %30-60 indirim alacağın fiyat modeli hangisidir?',
    options: [
      { id: 'a', text: 'On-demand' },
      { id: 'b', text: 'Spot' },
      { id: 'c', text: 'Reserved / Savings Plan' },
      { id: 'd', text: 'Free tier' },
    ],
    correctId: 'c',
    explanation:
      'Reserved Instance ve Savings Plan, uzun taahhüt karşılığı büyük indirim sağlar. Spot çok ucuzdur ama güvenilir değildir, on-demand ise taahhütsüz ve pahalıdır.',
  },
  {
    id: 'q-serverless',
    prompt: 'Sunucusuz (serverless) faturalandırma hangi iki bileşene dayanır?',
    options: [
      { id: 'a', text: 'vCPU ve RAM kapasitesi' },
      { id: 'b', text: 'İstek sayısı ve yürütme süresi (GB-saniye)' },
      { id: 'c', text: 'Depolama GB ve IOPS' },
      { id: 'd', text: 'Egress GB ve CDN isteği' },
    ],
    correctId: 'b',
    explanation:
      'Lambda/Functions gibi servislerde fiyat, çağrı sayısı + yürütülen GB-saniye üzerinden hesaplanır. Boşta duran kaynak yoktur.',
  },
  {
    id: 'q-region',
    prompt: 'Türkiye’deki bir kullanıcı için en düşük gecikmeyi hangi yaklaşım garanti eder?',
    options: [
      { id: 'a', text: 'ABD Doğu bölgesi seçmek' },
      { id: 'b', text: 'Coğrafi olarak en yakın bölgeyi seçmek' },
      { id: 'c', text: 'Her zaman spot örnek kullanmak' },
      { id: 'd', text: 'Veriyi nesne depolamada tutmak' },
    ],
    correctId: 'b',
    explanation:
      'Gecikme, fiziksel uzaklığa bağlıdır. En yakın bölge (ör. Frankfurt, Amsterdam) genelde en düşük gecikmeyi verir; ama uyumluluk ve fiyat da seçimi etkiler.',
  },
  {
    id: 'q-gpu',
    prompt: 'Bir yapay zeka modelini 7/24 GPU’da çalışır bırakmak yerine hangi yaklaşım daha ekonomiktir?',
    options: [
      { id: 'a', text: 'GPU’yu kapatıp yerine CPU kullanmak' },
      { id: 'b', text: 'Çıkarım için küçük örnek veya sunucusuz GPU kullanmak' },
      { id: 'c', text: 'GPU saatini iki katına çıkarmak' },
      { id: 'd', text: 'Veriyi GPU yerine RAM’de tutmak' },
    ],
    correctId: 'b',
    explanation:
      'Çıkarım (inference) genelde küçük örneklerde yapılabilir. Sunucusuz GPU veya spot, eğitim dışı işlerde ciddi tasarruf sağlar.',
  },
  {
    id: 'q-free-tier',
    prompt: 'Ücretsiz katman (Free tier) ile ilgili doğru ifade hangisidir?',
    options: [
      { id: 'a', text: 'Süresiz her şeyi ücretsiz kullanabilirsin' },
      { id: 'b', text: 'Always Free kaynaklar kredi bitince bile otomatik ücretlenmez' },
      { id: 'c', text: 'Free tier sadece ABD vatandaşlarına açıktır' },
      { id: 'd', text: 'Free tier üretim trafiği için tasarlanmıştır' },
    ],
    correctId: 'b',
    explanation:
      'Always Free kaynaklar (ör. Oracle Cloud, küçük Azure VM) kredi bitse bile ücret kesmez; ancak kapasiteleri küçüktür, üretim yükü için yetersiz kalabilir.',
  },
] as const

/** Tüm eğitim içeriğinin sürümü, gelecekte güncellendiğinde gösterilebilir. */
export const educationVersion = '2026-08-19' as const

/**
 * Konu derinleştirme içerikleri.
 * Her derinleştirme: ön koşullar, 4-6 adımlı yolculuk, kısa okuma paragrafları,
 * küçük şema ve sonraki adım önerisi.
 */
export interface DeepDive {
  id: string
  title: string
  oneLiner: string
  prerequisites: readonly string[]
  steps: ReadonlyArray<{ title: string; text: string }>
  architecture: { caption: string; flow: readonly string[] }
  pitfall: string
  nextStep: string
}

export const deepDives: readonly DeepDive[] = [
  {
    id: 'kubernetes-intro',
    title: "Kubernetes'a giriş",
    oneLiner: 'Konteynerlerini otomatik ölçekleyen, iyileştiren ve yöneticisini yapan kontrol düzlemi.',
    prerequisites: ['Hesaplama kavramı', 'Temel Linux (ssh, süreç)', 'Servis kategorisi olarak Kubernetes'],
    steps: [
      {
        title: '1. Konteyner farkını gör',
        text:
          'Tek bir VM içinde birden çok uygulamayı izole çalıştırmak için konteyner kullanılır. Docker imajı, uygulamanın kod, bağımlılık ve yapılandırmasıyla paketlenmiş halidir. Kubernetes ise bu imajları yüzlerce makineye dağıtır.',
      },
      {
        title: '2. Pod, servis, deployment',
        text:
          'Pod bir veya daha fazla konteyneri bir arada tutan en küçük birimdir. Servis, pod’lara sabit bir iç/DIŞ IP verir. Deployment ise “bu pod’un 3 kopyası çalışsın” dediğin kaynak.',
      },
      {
        title: '3. Kontrol düzlemi ve düğümler',
        text:
          'API server, scheduler, controller manager ve etcd kontrol düzlemini oluşturur. Çalışan düğümler (worker nodes) konteynerleri çalıştırır. Yönetilen K8s’te (EKS/AKS/GKE) sağlayıcı kontrol düzlemini yönetir, sen sadece düğüm veya pod tanımlarsın.',
      },
      {
        title: '4. YAML ile niyetini ifade et',
        text:
          'İstediğin durumu (3 kopya, 512MB RAM, 80 portu açık) YAML manifestinde yazarsın. Kubernetes gerçek durumu bu niyete yaklaştırmaya çalışır. kubectl apply -f deployment.yaml yeterlidir.',
      },
      {
        title: '5. Ölçekleme ve kendini iyileştirme',
        text:
          'Bir pod çökerse controller otomatik yeni pod açar. Yük artınca Horizontal Pod Autoscaler (HPA) kopya sayısını artırır. Düğüm yetmezse Cluster Autoscaler yeni düğüm ekler (genelde 1-2 dakika sürer).',
      },
    ],
    architecture: {
      caption: 'Tipik bir K8s isteğin akışı',
      flow: [
        'Geliştirici → kubectl apply (YAML)',
        'API Server → etcd (durumu yazar)',
        'Scheduler → uygun düğüm seçer',
        'kubelet → konteyneri düğümde başlatır',
        'Servis → dış trafiği pod’a yönlendirir',
      ],
    },
    pitfall:
      'İlk uygulama için K8s kurmak çoğu zaman erken: tek bir VM, hatta PaaS daha hızlı ve ucuzdur. K8s, birden çok servis, sık güncelleme ve taşınabilirlik ihtiyacı varsa anlamlıdır.',
    nextStep:
      'Yerel olarak minikube ve kind ile 1 pod’luk bir “hello world” çalıştır; sonra bir yönetilen küme üzerinde 2 kopya + yük dağıtıcı dene.',
  },
  {
    id: 'serverless-architectures',
    title: 'Sunucusuz mimari desenleri',
    oneLiner: 'Sunucu yönetmeden, yalnızca çalıştığı an için faturalanan olay tabanlı bileşimler.',
    prerequisites: ['Sunucusuz (serverless) kavramı', 'HTTP temelleri', 'En az bir bulut sağlayıcısında deneyim'],
    steps: [
      {
        title: '1. Olay kaynağını seç',
        text:
          'Sunucusuz bir iş, bir olay tarafından tetiklenir: HTTP isteği, kuyruğa mesaj, zamanlayıcı, dosya yükleme. İlk adım, tetikleyiciyi doğru seçmektir; çünkü her sağlayıcı farklı tetikleyiciler sunar (API Gateway, S3 event, EventBridge, Pub/Sub…).',
      },
      {
        title: '2. Tek sorumluluk ilkesi',
        text:
          'Her fonksiyonu küçük ve tek bir iş yapacak şekilde yaz: bir resmi dönüştür, bir satırı doğrula, bir webhook’u yayınla. Büyük fonksiyonlar hızla monolitik sunucu koduna döner.',
      },
      {
        title: '3. Durum ve kalıcılık',
        text:
          'Lambda/Cloud Functions stateless’tir. Kalıcı veri için harici servis kullan: DynamoDB, Cosmos DB, S3, Redis. Aynı fonksiyon aynı anda yüzlerce kez çalışabilir; yerel dosya sistemi güvenli değildir.',
      },
      {
        title: '4. Hata yönetimi ve tekrar deneme',
        text:
          'Geçici hatalarda sağlayıcı otomatik tekrar dener. Kalıcı hatalarda ölü mektup kuyruğu (DLQ) kullan; olayları kaybetmek sessiz veri bozulmasına yol açar. Idempotent (aynı olayı iki kez işlemek aynı sonucu vermeli) fonksiyonlar yaz.',
      },
      {
        title: '5. Maliyet ve soğuk başlangıç',
        text:
          'Seyrek çağrılan fonksiyonlar için soğuk başlangıç 200-500 ms sürebilir; bu, kullanıcıya dönen API’lerde sorun olur. Isınık tutma (provisioned concurrency) ile bu gecikmeyi düşürebilirsin, ama ek maliyet gelir.',
      },
    ],
    architecture: {
      caption: 'S3 yüklemesini işleyen sunucusuz boru hattı',
      flow: [
        'Kullanıcı dosyayı S3/Blob’a yükler',
        'Event tetikler Lambda/Functions',
        'Fonksiyon meta veriyi veritabanına yazar',
        'Sıra (SQS/Pub-Sub) başka bir fonksiyonu tetikler',
        'CDN, küçük resmi son kullanıcıya sunar',
      ],
    },
    pitfall:
      '“Sunucusuz = ucuz” her zaman doğru değildir. Milyonlarca istek alan bir API’de klasik VM daha ucuz olabilir. Soğuk başlangıç ve dış servis çağrı maliyetleri gözden kaçar.',
    nextStep:
      'Bir resim yükleme uygulaması yaz: kullanıcı yükler → S3 event → Lambda küçük resim üretir → API üzerinden döner. Tüm akışı kendin gözlemle.',
  },
  {
    id: 'gpu-ai-workloads',
    title: 'GPU ve yapay zeka iş yükleri',
    oneLiner: 'Model eğitimi ve çıkarımı için GPU gücünü doğru büyüklükte, doğru süreyle kiralamak.',
    prerequisites: ['AI / GPU kategorisi', 'Temel derin öğrenme bilgisi', 'Bulut maliyet modelleri'],
    steps: [
      {
        title: '1. VRAM ihtiyacını belirle',
        text:
          'GPU seçiminin anahtarı VRAM (GPU bellek). 7B parametreli bir modeli çıkarımda çalıştırmak için yaklaşık 14 GB VRAM yeterli; 70B için 140 GB gerekir. Eğitim çok daha fazla VRAM ve süre ister.',
      },
      {
        title: '2. Eğitim ve çıkarımı ayır',
        text:
          'Eğitim (training) saatler/günler sürer, çok pahalıdır. Çıkarım (inference) milisaniyeler sürer, ucuz olabilir. Aynı GPU tipini her ikisinde kullanmak gerekmez: eğitimde H100, çıkarımda L4 veya T4 ile maliyet düşer.',
      },
      {
        title: '3. Spot ve rezervasyonu birlikte kullan',
        text:
          'Eğitim genelde kesintiyi tolere eder → spot örneklerle %60-90 tasarruf. Üretim çıkarımı kesintisiz olmalı → on-demand veya 1 yıllık rezerve. İkisini ayrı pipeline olarak planla.',
      },
      {
        title: '4. Veri aktarımı ve depolama',
        text:
          'Eğitim verisi yüzlerce GB olabilir. Veriyi aynı bölgede tutmak (ör. Frankfurt) çıkış trafiğini sıfırlar. Cloudflare R2 gibi çıkışsız depolama, eğitim verisini sık erişimli tutar.',
      },
      {
        title: '5. İzleme ve bütçe',
        text:
          'GPU saatleri hızlıca 4 haneli faturalara ulaşır. Bütçe uyarısı koy (ör. günlük 50$), gereksiz çalışan örnekleri kapat. Kullanmadığın örnekleri mutlaka sonlandır; “silmeyi unuttum” en sık GPU faturasıdır.',
      },
    ],
    architecture: {
      caption: 'Bir yapay zeka ürününün bileşenleri',
      flow: [
        'Veri → Object Storage (R2/S3/Blob)',
        'Eğitim pipeline → spot GPU',
        'Model registry → Container Registry',
        'Çıkarım servisi → küçük GPU / sunucusuz',
        'API → kullanıcı isteğini karşılar',
      ],
    },
    pitfall:
      'Büyük modeli 7/24 çalışır bırakmak. Çıkarım için genelde 1-2 kopya yeterlidir; model sıcak kalmalıysa provisioned concurrency ile sunucusuz GPU daha ekonomik olabilir.',
    nextStep:
      'Hugging Face’teki küçük bir modeli (ör. 1-3B) indir, 4-bit nicemleme ile bir L4 GPU’da 10 dakika çalıştır; saatlik maliyeti fatura tahmincisinden kontrol et.',
  },
] as const
