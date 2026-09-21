import { t } from '../i18n'
import type { ServiceCategory } from '../domain/catalog'

/**
 * Eğitim içerikleri.
 *
 * Uygulama genelinde gösterilen kavramsal kartlar, görsel diyagramlar,
 * fiyatlandırma modelleri, sağlayıcı özetleri, sözlük ve bilgi testi için
 * tip-güvenli içerik kaynağı. Türkçe kaynak metinleri seçili dile çevrilir; içerik üniversite
 * öğrencisi seviyesinde sade bir dille sunulur.
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
    title: t('Kendi sunucun (On-Premises)'),
    shortLabel: 'On-prem',
    whoManages: t('Her şeyi sen: sunucu, elektrik, soğutma, ağ, işletim sistemi, yedekleme.'),
    example: t('Okulun bilgisayar laboratuvarı, kendi ofisindeki sunucu.'),
    userResponsibility: 100,
  },
  {
    id: 'iaas',
    title: t('IaaS — Altyapı hizmeti'),
    shortLabel: 'IaaS',
    whoManages: t(
      'Sağlayıcı donanım ve veri merkezini yönetir; sen işletim sistemi, ağ ve uygulamayı kurarsın.',
    ),
    example: 'Azure VM, EC2, Google Compute Engine.',
    userResponsibility: 70,
  },
  {
    id: 'paas',
    title: t('PaaS — Platform hizmeti'),
    shortLabel: 'PaaS',
    whoManages: t(
      'Sağlayıcı işletim sistemi ve çalışma zamanını; seçtiğin hizmete göre veritabanı motorunu da yönetir. Sen uygulama kodu, veri ve yapılandırmadan sorumlusun.',
    ),
    example: 'Azure App Service, App Engine, Heroku, Vercel.',
    userResponsibility: 30,
  },
  {
    id: 'saas',
    title: t('SaaS — Yazılım hizmeti'),
    shortLabel: 'SaaS',
    whoManages: t(
      'Sağlayıcı uygulamayı ve altyapıyı işletir; sen verinin korunması, hesaplar, erişim izinleri ve güvenli yapılandırmadan sorumlusun.',
    ),
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
    title: t('Hesaplama (Compute)'),
    oneLiner: t('Sanal makine (VM) ile çalışan genel amaçlı işlemci gücü.'),
    whatIsIt: t(
      'Bir işletim sistemi ve CPU/RAM ayırdığın, uzaktan yönettiğin bir bilgisayar olarak düşün. vCPU ve RAM seçtikçe fiyat yükselir; 730 saat/ay genelde ay boyunca açık kalmanın fiyatıdır.',
    ),
    whenToUse: t(
      '7/24 ayakta kalması gereken web siteleri, API servisleri, oyun sunucuları, kurumsal uygulamalar için idealdir.',
    ),
    analogy: t('Kendi dairen: senin yönetimin, sağlayıcı sadece binayı ve elektriği sağlıyor.'),
    keyTerms: [
      'vCPU',
      'RAM',
      t('örnek türü (instance type)'),
      t('bölge (region)'),
      t('aylık 730 saat'),
    ],
    commonMistake: t(
      'Sadece CPU ve RAM seçip trafiği (egress) unutmak: dışarıya veri göndermek ayrıca ücretlendirilir.',
    ),
  },
  {
    category: 'object-storage',
    title: t('Nesne Depolama (Object Storage)'),
    oneLiner: t('Dosyalarını (resim, video, yedek, log) sınırsız ölçekte tutan servistir.'),
    whatIsIt: t(
      'Klasik bir disk gibi düşün ama dosyalarını "obje" olarak yazarsın. S3, Azure Blob, GCS gibi servisler buna örnektir. GB başına aylık ücret vardır; okuma/yazma istekleri de küçük bir ek getirir.',
    ),
    whenToUse: t(
      'Statik site dosyaları, yedeklemeler, kullanıcı yüklediği medya, log arşivi, büyük veri setleri için uygundur.',
    ),
    analogy: t('Kiralık depo: ay başına m³ başına para ödersin, istediğin zaman erişirsin.'),
    keyTerms: [
      t('bucket / kova'),
      t('GB/ay'),
      t('erişim sınıfı (hot/cool/archive)'),
      t('istek başına ücret'),
    ],
    commonMistake: t(
      'Sık erişilen veriyi arşiv katmanına koymak: okuma ücreti aylık tasarrufunu geçebilir.',
    ),
  },
  {
    category: 'managed-database',
    title: t('Yönetilen Veritabanı'),
    oneLiner: t('Sağlayıcının sana kurduğu, yedeklediği ve güncellediği veritabanı motorudur.'),
    whatIsIt: t(
      'PostgreSQL, MySQL, MongoDB gibi bir veritabanını kendin kurmak yerine altyapı işletimini sağlayıcıya bırakırsın. Yedekleme, yama ve çoğaltma seçenekleri hizmete ve yapılandırmaya göre değişir. İşlem gücü, depolama, IOPS ve yedekleme ayrı ayrı faturalanabilir.',
    ),
    whenToUse: t(
      'Veri bütünlüğü kritik uygulamalar, e-ticaret, kullanıcı hesapları, transaksiyonel iş yükleri için idealdir.',
    ),
    analogy: t(
      'Profesyonel bir aşçı tutmak: sen malzemeyi söylersin, aşçı yemeği yapar, servisi de o yapar.',
    ),
    keyTerms: [
      t('saatlik örnek'),
      t('depolama GB/ay'),
      'IOPS',
      t('yedekleme penceresi'),
      t('yüksek erişilebilirlik (HA)'),
    ],
    commonMistake: t(
      'Sadece saatlik ücrete bakıp IOPS ve yedekleme boyutunu hesaba katmamak: gerçek fatura bunların üstünde büyür.',
    ),
  },
  {
    category: 'serverless',
    title: t('Sunucusuz (Serverless)'),
    oneLiner: t(
      'Sunucu işletimini sağlayıcıya bırakırsın; ücret, seçilen plan ve kullanım bileşenlerine bağlıdır.',
    ),
    whatIsIt: t(
      'Lambda, Cloud Run functions ve Azure Functions gibi servislerde sunucuları sağlayıcı işletir. İstek, yürütme süresi ve ayrılan bellek/CPU ücretlenebilir. Minimum örnek, hazır kapasite, ağ, günlük ve depolama ücretleri boşta da sürebilir.',
    ),
    whenToUse: t(
      'Anlık tetiklenen işler: bir resmi dönüştürmek, webhook karşılamak, planlanmış cron görevi, düşük trafiğe sahip API uçları.',
    ),
    analogy: t('Taksi: sadece bindiğin dakika ve gidilen mesafe için ödeme, garaj yok.'),
    keyTerms: [
      t('istek sayısı'),
      t('GB-saniye'),
      t('soğuk başlangıç (cold start)'),
      t('eşzamanlılık (concurrency)'),
    ],
    commonMistake: t(
      'Sürekli akan yüksek trafik için kullanmak: kullanım desenine göre klasik VM daha ucuz olabilir; sunucusuz maliyet milyonlarca istekte hızla artabilir.',
    ),
  },
  {
    category: 'cdn-network',
    title: t('CDN ve Ağ'),
    oneLiner: t(
      'İçeriğini dünyadaki uç noktalara dağıtıp son kullanıcıya en yakın yerden servis eder.',
    ),
    whatIsIt: t(
      'CloudFront, Cloudflare, Azure CDN gibi servisler statik veya önbelleklenebilir içeriği kullanıcıya yakın sunucudan verir. Çıkış trafiği (egress, GB) genelde en büyük fatura kalemidir.',
    ),
    whenToUse: t(
      'Statik site, video yayını, yazılım indirme, global kullanıcı tabanı olan her uygulama için idealdir.',
    ),
    analogy: t(
      'Bir kitabı şehirdeki tüm kütüphanelere göndermek: kullanıcı en yakın kütüphaneden alır.',
    ),
    keyTerms: ['egress GB', t('önbellek isabet oranı'), 'origin shield', 'TLS/SSL', 'WAF'],
    commonMistake: t(
      "Tüm trafiği origin'e gönderip CDN'in önbelleğini atlamak: hem maliyet hem gecikme artar.",
    ),
  },
  {
    category: 'kubernetes',
    title: t('Kubernetes (Konteyner Orkestrasyonu)'),
    oneLiner: t(
      'Konteynerlerini (Docker) otomatik ölçekleyen, dağıtan ve iyileştiren kontrol düzlemi.',
    ),
    whatIsIt: t(
      'EKS, AKS, GKE gibi yönetilen Kubernetes servisleri, sen sadece uygulamanı konteyner olarak gönderirsin; sağlayıcı kontrol düzlemini (control plane) yönetir. Faturalama kontrol düzlemi ücreti + çalışan düğüm (worker node) saatleridir.',
    ),
    whenToUse: t(
      'Mikroservis mimarisi, sık güncellenen uygulamalar, taşınabilir (portable) altyapı isteyen ekipler için uygundur.',
    ),
    analogy: t(
      'Bir orkestranın şefi: hangi enstrüman ne zaman çalacak, sen söylersin; şef partiyi yönetir.',
    ),
    keyTerms: [t('düğüm (node)'), t('kontrol düzlemi'), 'pod', 'servis', t('ölçekleyici (HPA)')],
    commonMistake: t(
      'Küçük bir uygulama için Kubernetes kurmak: yönetim yükü, maliyetin önüne geçer; tek bir VM daha verimli olabilir.',
    ),
  },
  {
    category: 'gpu-ai',
    title: 'AI / GPU',
    oneLiner: t('Yapay zeka model eğitimi ve çıkarımı için GPU gücü.'),
    whatIsIt: t(
      'NVIDIA H100, A100, L4 gibi GPU’ları saatlik veya aylık kiralarsın. VRAM (GB) ve saat, fiyatı belirleyen iki temel bileşendir. Aynı GPU için saatlik ücret kullanım amacından çok ürün ve plana bağlıdır; toplam maliyet çalışma süresi, verim ve ek kaynaklarla değişir.',
    ),
    whenToUse: t(
      'Derin öğrenme modeli eğitimi, büyük dil modeli (LLM) ince ayarı, video işleme, bilimsel simülasyon için idealdir.',
    ),
    analogy: t('Süper bilgisayara saatlik erişim: sadece ihtiyacın olduğu an için açarsın.'),
    keyTerms: [t('GPU saati'), 'VRAM', t('eğitim vs çıkarım'), 'NVIDIA CUDA', t('kuyruk (queue)')],
    commonMistake: t(
      'Modeli ölçmeden GPU’da 7/24 çalışır durumda bırakmak: nicemleme, daha küçük GPU örneği veya sunucusuz çalışma trafik desenine göre maliyeti düşürebilir.',
    ),
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
    title: t('İsteğe bağlı (On-demand)'),
    oneLiner: t('Saniye/saat bazında, taahhütsüz faturalandırma.'),
    pros: t('İstediğin an açıp kapatabilirsin; taahhüt yok, esnek.'),
    cons: t(
      'Sürekli kullanımda uygun bir taahhütten pahalı olabilir; seyrek kullanımda taahhüt vermek daha maliyetli olabilir.',
    ),
    bestFor: t('Kısa süreli testler, ödev/proje, değişken iş yükü.'),
    savingsHint: 0,
  },
  {
    id: 'reserved',
    title: t('Rezerve / Taahhütlü (Reserved)'),
    oneLiner: t(
      'Belirli kaynak veya kullanım için süreli taahhüt karşılığında indirim alabilirsin; oran ve süre ürüne göre değişir.',
    ),
    pros: t('Düzenli ve öngörülebilir kullanımda bütçe planlamasını kolaylaştırabilir.'),
    cons: t('Taahhüt süresi boyunca ödeme devam eder; erken iptal varsa ceza olabilir.'),
    bestFor: t('7/24 çalışacak, ölçeği bilinen üretim iş yükleri.'),
    savingsHint: 60,
  },
  {
    id: 'spot',
    title: t('Spot (Kesilebilir kapasite)'),
    oneLiner: t('Sağlayıcının boş kalan kapasitesini çok ucuza alırsın; her an geri alınabilir.'),
    pros: t(
      'İsteğe bağlı fiyatın altında olabilir; indirim ve kapasite sağlayıcıya, bölgeye ve zamana bağlıdır.',
    ),
    cons: t(
      'Kesinti uyarısı ve süre sağlayıcıya göre değişir; AWS EC2’deki iki dakikalık bildirim bile en iyi çaba esaslıdır ve hibernasyonda ön süre yoktur. Kontrol noktası ve yeniden deneme gerekir.',
    ),
    bestFor: t('Toplu iş (batch), simülasyon, kuyruk tabanlı iş yükleri, ML eğitimi.'),
    savingsHint: 80,
  },
  {
    id: 'savings-plan',
    title: t('Tasarruf planı (Savings plan)'),
    oneLiner: t('Saatlik harcama taahhüdü vererek esnek indirim.'),
    pros: t(
      'Seçilen planın kapsamı içinde örnek ailesi veya hizmet değiştirme esnekliği sağlayabilir.',
    ),
    cons: t(
      'Taahhüdü kullanmasan da ödersin; kapsam dışı veya taahhüdü aşan kullanım ayrıca faturalanır.',
    ),
    bestFor: t('Birden çok servis kullanan, ölçeği yıldan yıla değişen ekipler.'),
    savingsHint: 40,
  },
  {
    id: 'free-tier',
    title: t('Ücretsiz katman (Free tier)'),
    oneLiner: t(
      'Yeni hesap kredisi, süreli teklif veya sürekli küçük bir kota ile ücretsiz başlangıç.',
    ),
    pros: t('Koşullar uygunsa öğrenme ve prototipleme maliyetini düşürür.'),
    cons: t(
      'Süre, kota ve aşım davranışı sağlayıcıya ve hesap planına göre değişir; ücretli hesaplarda aşım otomatik faturalanabilir.',
    ),
    bestFor: t('Öğrenciler, küçük yan projeler, prototip ve demolar.'),
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
  title: t('Bölge (Region) neden önemli?'),
  whyItMatters: t(
    'Verinin fiziksel olarak tutulduğu veri merkezi coğrafyasıdır. Türkiye’den kullanıcıya en yakın bölgeyi seçmek gecikmeyi düşürür; ancak uyumluluk, fiyat ve hizmet kapsamı bölgeye göre değişir.',
  ),
  bulletPoints: [
    t(
      'Gecikme (latency): İstanbul’a fiziksel olarak yakın bölgeler çoğu bağlantıda daha düşük gecikme verir; gerçek sonucu kendi ağından ölçmelisin.',
    ),
    t(
      'Veri egemenliği: Bazı sektörler verinin belirli bir ülkede kalmasını zorunlu kılar; bu durumda bölgeyi ona göre seçersin.',
    ),
    t(
      'Fiyat: Aynı kaynak, bölgeye göre farklı fiyatlanabilir; hesaplama, depolama ve ağ ücretlerini birlikte karşılaştırmalısın.',
    ),
    t(
      'Hizmet kapsamı: Yeni özelliklerin ilk sunulduğu bölgeler sağlayıcıya göre değişir; her hizmet her bölgede bulunmayabilir.',
    ),
  ],
  misconception: t(
    '"En yakın bölge her zaman en iyisidir" değil: bazen uzak bölge daha ucuz veya daha yeni özelliklere sahip olabilir.',
  ),
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
    oneLiner: t('Microsoft ekosistemiyle iç içe, kurumsal ve hibrit bulut.'),
    forWhom: t('Microsoft 365, Active Directory, .NET kullanan ekipler.'),
    signature: t('Visual Studio, Entra ID ve Windows Server ile bütünleşik.'),
  },
  {
    providerId: 'gcp',
    oneLiner: t('Veri, yapay zeka ve Kubernetes konusunda güçlü, şeffaf fiyatlandırma.'),
    forWhom: t('Veri bilimi, ML ve K8s odaklı ekipler.'),
    signature: t('BigQuery, Vertex AI ve güçlü Kubernetes motoru (GKE).'),
  },
  {
    providerId: 'aws',
    oneLiner: t('Geniş hizmet kataloğu, olgun ekosistem.'),
    forWhom: t('Genel amaçlı üretim, startup, kurumsal.'),
    signature: t('EC2, S3 ve Lambda ile geniş bir yapı taşı kataloğu.'),
  },
  {
    providerId: 'hetzner',
    oneLiner: t('Avrupa merkezli ekonomik bulut, basit saatlik fiyat.'),
    forWhom: t('Bütçe hassasiyeti olan öğrenci ve KOBİ projeleri.'),
    signature: t('Düşük fiyat, şeffaf üst sınır, sınırlı yönetilen hizmet.'),
  },
  {
    providerId: 'oracle',
    oneLiner: t(
      'Koşullara ve kapasiteye bağlı Always Free kaynakları, Oracle veritabanı hizmetleri.',
    ),
    forWhom: t('Öğrenciler, Oracle DB kullanan ekipler.'),
    signature: t('Sürekli ücretsiz küçük VM + Autonomous DB kotası.'),
  },
  {
    providerId: 'cloudflare',
    oneLiner: t('Küresel edge ağı ve R2’de ücretsiz internet çıkışı.'),
    forWhom: t('Statik site, API, DDoS koruması arayanlar.'),
    signature: t('R2’de ücretsiz internet çıkışı; Workers ile edge tabanlı sunucusuz işlem.'),
  },
  {
    providerId: 'digitalocean',
    oneLiner: t('Geliştirici dostu, sade arayüz, öngörülebilir paket fiyatları.'),
    forWhom: t('İlk sunucusunu kuran öğrenciler, KOBİ.'),
    signature: t('Droplet, App Platform, basit dokümantasyon.'),
  },
  {
    providerId: 'vultr',
    oneLiner: t('Çok sayıda bölge, basit saatlik genel amaçlı sunucu.'),
    forWhom: t('Konum esnekliği isteyen küçük ekipler.'),
    signature: t(
      'Birden çok bölge, saatlik faturalama ve hazır uygulama imajları; bulunabilirlik ürüne göre değişir.',
    ),
  },
] as const

export interface GlossaryTerm {
  /** Original term used by existing saved learning progress; never localized. */
  id: string
  term: string
  definition: string
  example: string
}

export const glossary: readonly GlossaryTerm[] = [
  {
    id: 'vCPU',
    term: 'vCPU',
    definition: t(
      'Sağlayıcının sanal makineye ayırdığı işlemci birimi. Fiziksel çekirdek ve iş parçacığı karşılığı sağlayıcıya ve örnek ailesine göre değişir.',
    ),
    example: t(
      '2 vCPU + 4 GB RAM bir başlangıç senaryosudur; yeterliliği uygulama, eşzamanlılık ve yük testi belirler.',
    ),
  },
  {
    id: 'RAM',
    term: 'RAM',
    definition: t('Çalışma anında verilerin tutulduğu bellek. Veritabanı ve önbellek için kritik.'),
    example: t('PostgreSQL için GB başına ayrılan RAM, sorgu hızını doğrudan etkiler.'),
  },
  {
    id: 'Egress (Çıkış trafiği)',
    term: t('Egress (Çıkış trafiği)'),
    definition: t('Buluttan dışarıya gönderilen veri. Genelde GB başına ücretlendirilir.'),
    example: t('Sitenin ziyaretçilere gönderdiği resim ve video GB olarak faturalanır.'),
  },
  {
    id: 'Ingress (Giriş trafiği)',
    term: t('Ingress (Giriş trafiği)'),
    definition: t('Buluta dışarıdan gelen veri. Çoğu sağlayıcıda ücretsizdir.'),
    example: t(
      'Fotoğrafın giriş trafiği ücretsiz olsa bile yazma isteği, depolama ve işleme ücretlenebilir.',
    ),
  },
  {
    id: 'Bölge (Region)',
    term: t('Bölge (Region)'),
    definition: t('Verinin fiziksel olarak tutulduğu coğrafi veri merkezi grubu.'),
    example: t('westeurope = Hollanda, eu-central-1 = Frankfurt.'),
  },
  {
    id: 'Availability Zone (AZ)',
    term: 'Availability Zone (AZ)',
    definition: t(
      'Aynı bölge içindeki ayrı hata alanlarıdır. Uygulama birden çok AZ’ye uygun tasarlanmışsa tek AZ arızasında hizmet başka bir AZ’den sürebilir.',
    ),
    example: t(
      'İki AZ, uygun çoğaltma ve yük devriyle AZ arızasına dayanıklılığı artırabilir; ortak bağımlılıklar ayrıca incelenir.',
    ),
  },
  {
    id: 'IOPS',
    term: 'IOPS',
    definition: t('Saniyedeki okuma/yazma işlemi. Veritabanı ve disk performansı için ölçüt.'),
    example: t('Yoğun yazma trafiği olan bir veritabanı için yüksek IOPS seçilir.'),
  },
  {
    id: 'SLA',
    term: 'SLA',
    definition: t(
      'Hizmet seviyesi anlaşması; tanımlı ölçüm dönemi, koşullar ve istisnalar içeren hizmet hedefi. İhlalde hizmet kredisi koşulları uygulanabilir.',
    ),
    example: t(
      '%99,99 kullanılabilirlik hedefinin 30 günlük matematiksel karşılığı 4,32 dakikadır; bu bir kesinti üst sınırı garantisi değildir.',
    ),
  },
  {
    id: 'Konteyner',
    term: t('Konteyner'),
    definition: t('Uygulamanın kod, bağımlılık ve yapılandırmasıyla birlikte taşınabilir paketi.'),
    example: t(
      'Aynı imajın çalışması CPU mimarisi, çekirdek, yapılandırma ve dış bağımlılık uyumuna bağlıdır.',
    ),
  },
  {
    id: 'Otomatik ölçekleme',
    term: t('Otomatik ölçekleme'),
    definition: t('Yük arttığında yeni örneklerin otomatik açılıp, azaldığında kapanması.'),
    example: t('Bir e-ticaret sitesi kampanya günü 3 kat örnek açar, gece 1 örneğe döner.'),
  },
  {
    id: 'Spot örnek',
    term: t('Spot örnek'),
    definition: t('Sağlayıcının boş kapasitesini çok ucuza kiralamak; her an geri alınabilir.'),
    example: t(
      'Toplu video dönüştürmeyi kontrol noktalarıyla spot üzerinde denemek; toplam maliyete yeniden başlatmaları da eklemek.',
    ),
  },
  {
    id: 'Dağıtım (deploy)',
    term: t('Dağıtım (deploy)'),
    definition: t('Uygulamanın yeni sürümünün bulut ortamına yüklenip çalıştırılması.'),
    example: t('CI/CD işlem hattı, her Git gönderiminde yeni sürümü otomatik olarak dağıtır.'),
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
    prompt: t(
      'Sanal makine (VM) kiralayıp kendi işletim sistemini sen kurduğunda bu model hangisidir?',
    ),
    options: [
      { id: 'a', text: 'SaaS' },
      { id: 'b', text: 'PaaS' },
      { id: 'c', text: 'IaaS' },
      { id: 'd', text: 'On-premises' },
    ],
    correctId: 'c',
    explanation: t(
      'IaaS’te sağlayıcı donanımı verir, OS ve üstü sana aittir. PaaS’te OS bile sağlayıcıdadır, SaaS’te uygulamayı doğrudan kullanırsın.',
    ),
  },
  {
    id: 'q-egress',
    prompt: t('CDN kullanmanın asıl ekonomik faydası nedir?'),
    options: [
      { id: 'a', text: t('Egress trafiğini tamamen ücretsiz yapar') },
      {
        id: 'b',
        text: t(
          'Önbellek isabetleri origin yükünü azaltabilir; toplam maliyet CDN ücretleriyle birlikte değerlendirilir',
        ),
      },
      { id: 'c', text: t('Veritabanı sorgu sayısını azaltır') },
      { id: 'd', text: t('Disk IOPS’unu sıfırlar') },
    ],
    correctId: 'b',
    explanation: t(
      'CDN önbelleği origin isteklerini azaltabilir. Tasarruf; isabet oranı, CDN çıkışı, istekler ve origin ücretlerinin toplamına bağlıdır; otomatik değildir.',
    ),
  },
  {
    id: 'q-reserved',
    prompt: t(
      'Süreli kaynak veya harcama taahhüdü karşılığında indirim sunabilen fiyat modeli hangisidir?',
    ),
    options: [
      { id: 'a', text: 'On-demand' },
      { id: 'b', text: 'Spot' },
      { id: 'c', text: 'Reserved / Savings Plan' },
      { id: 'd', text: 'Free tier' },
    ],
    correctId: 'c',
    explanation: t(
      'Reserved Instance ve Savings Plan, plan kapsamındaki kullanım için taahhüt karşılığı indirim sunar. Kullanılmayan taahhüt de maliyetlidir; oran ve koşullar ürüne göre değişir.',
    ),
  },
  {
    id: 'q-serverless',
    prompt: t('İsteğe bağlı Lambda Functions kullanımında iki temel fiyat bileşeni hangisidir?'),
    options: [
      { id: 'a', text: t('vCPU ve RAM kapasitesi') },
      { id: 'b', text: t('İstek sayısı ve yürütme süresi (GB-saniye)') },
      { id: 'c', text: t('Depolama GB ve IOPS') },
      { id: 'd', text: t('Egress GB ve CDN isteği') },
    ],
    correctId: 'b',
    explanation: t(
      'İsteğe bağlı Lambda Functions için istek ve bellekle ağırlıklandırılmış süre temel bileşenlerdir. Hazır kapasite, ağ, günlük ve depolama ayrıca ücretlenebilir; CLD API senaryosu yalnız istek bileşenini modeller.',
    ),
  },
  {
    id: 'q-region',
    prompt: t('Türkiye’deki bir kullanıcı için hangi yaklaşım gecikmeyi genellikle azaltır?'),
    options: [
      { id: 'a', text: t('ABD Doğu bölgesi seçmek') },
      { id: 'b', text: t('Coğrafi olarak en yakın bölgeyi seçmek') },
      { id: 'c', text: t('Her zaman spot örnek kullanmak') },
      { id: 'd', text: t('Veriyi nesne depolamada tutmak') },
    ],
    correctId: 'b',
    explanation: t(
      'Yakınlık çoğu zaman gecikmeyi azaltır; ancak ağ rotası ve sağlayıcı altyapısı sonucu etkiler. Üretim kararı öncesinde gerçek kullanıcı konumlarından ölçüm yapmalısın.',
    ),
  },
  {
    id: 'q-gpu',
    prompt: t('Seyrek ve değişken çıkarım trafiğinde hangi yaklaşım maliyeti düşürebilir?'),
    options: [
      { id: 'a', text: t('GPU’yu kapatıp yerine CPU kullanmak') },
      { id: 'b', text: t('Çıkarım için küçük örnek veya sunucusuz GPU kullanmak') },
      { id: 'c', text: t('GPU saatini iki katına çıkarmak') },
      { id: 'd', text: t('Veriyi GPU yerine RAM’de tutmak') },
    ],
    correctId: 'b',
    explanation: t(
      'Uygun model boyutu, nicemleme, küçük GPU örnekleri veya sunucusuz GPU boşta kalma maliyetini azaltabilir. En iyi seçenek trafik ve gecikme hedeflerine göre ölçülmelidir.',
    ),
  },
  {
    id: 'q-free-tier',
    prompt: t('Ücretsiz katman (Free tier) ile ilgili doğru ifade hangisidir?'),
    options: [
      { id: 'a', text: t('Süresiz her şeyi ücretsiz kullanabilirsin') },
      {
        id: 'b',
        text: t('Süre, kota ve aşım davranışı sağlayıcıya ve hesap planına göre değişir'),
      },
      { id: 'c', text: t('Free tier sadece ABD vatandaşlarına açıktır') },
      { id: 'd', text: t('Free tier üretim trafiği için tasarlanmıştır') },
    ],
    correctId: 'b',
    explanation: t(
      'Yeni hesap kredileri, süreli teklifler ve sürekli ücretsiz kotalar aynı değildir. Ücretli hesapta kota aşımı otomatik faturalanabilir; koşulları kaynak bağlantısından doğrulamalısın.',
    ),
  },
] as const

/** Tüm eğitim içeriğinin sürümü, gelecekte güncellendiğinde gösterilebilir. */
export const educationVersion = '2026-09-21' as const

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
    title: t('Kubernetes’a giriş'),
    oneLiner: t(
      'Konteynerlerini dağıtan, ölçekleyen ve istenen çalışma durumunda tutan orkestrasyon platformu.',
    ),
    prerequisites: [
      t('Hesaplama kavramı'),
      t('Temel Linux (ssh, süreç)'),
      t('Servis kategorisi olarak Kubernetes'),
    ],
    steps: [
      {
        title: t('1. Konteyner farkını gör'),
        text: t(
          'Tek bir VM içinde birden çok uygulamayı izole çalıştırmak için konteyner kullanılır. Docker imajı, uygulamanın kod, bağımlılık ve yapılandırmasıyla paketlenmiş halidir. Kubernetes ise bu imajları yüzlerce makineye dağıtır.',
        ),
      },
      {
        title: t('2. Pod, servis, deployment'),
        text: t(
          'Pod, bir veya daha fazla konteyneri bir arada tutan en küçük dağıtım birimidir. Service, değişen pod’lar için kararlı bir ağ uç noktası ve servis keşfi sağlar; dış erişim seçilen Service türüne bağlıdır. Deployment ise örneğin “bu pod’un üç kopyası çalışsın” dediğin kaynaktır.',
        ),
      },
      {
        title: t('3. Kontrol düzlemi ve düğümler'),
        text: t(
          'API server, scheduler, controller manager ve etcd kontrol düzlemini oluşturur. Çalışan düğümler (worker nodes) konteynerleri çalıştırır. Yönetilen K8s’te (EKS/AKS/GKE) sağlayıcı kontrol düzlemini yönetir, sen sadece düğüm veya pod tanımlarsın.',
        ),
      },
      {
        title: t('4. YAML ile niyetini ifade et'),
        text: t(
          'İstediğin durumu (üç kopya, 512 MB RAM, 80 numaralı port) YAML manifestinde yazarsın. kubectl apply -f deployment.yaml ile bildirimi kümeye uygular; ardından dağıtım, sağlık, ağ ve güvenlik ayarlarını doğrularsın.',
        ),
      },
      {
        title: t('5. Ölçekleme ve kendini iyileştirme'),
        text: t(
          'Bir pod çökerse controller yeni pod oluşturabilir. Yük artınca Horizontal Pod Autoscaler (HPA) kopya sayısını artırır; düğüm kapasitesi yetmezse Cluster Autoscaler yeni düğüm isteyebilir. Tepki süresi sağlayıcıya, imaja ve kapasiteye göre değişir.',
        ),
      },
    ],
    architecture: {
      caption: t('Tipik bir K8s isteğin akışı'),
      flow: [
        t('Geliştirici → kubectl apply (YAML)'),
        t('API Server → etcd (durumu yazar)'),
        t('Scheduler → uygun düğüm seçer'),
        t('kubelet → konteyneri düğümde başlatır'),
        t('Service → uygun tür ve ağ ayarıyla trafiği pod’a yönlendirir'),
      ],
    },
    pitfall: t(
      'İlk uygulama için K8s kurmak çoğu zaman erken: tek bir VM, hatta PaaS daha hızlı ve ucuzdur. K8s, birden çok servis, sık güncelleme ve taşınabilirlik ihtiyacı varsa anlamlıdır.',
    ),
    nextStep: t(
      'Yerel olarak minikube ve kind ile 1 pod’luk bir “hello world” çalıştır; sonra bir yönetilen küme üzerinde 2 kopya + yük dağıtıcı dene.',
    ),
  },
  {
    id: 'serverless-architectures',
    title: t('Sunucusuz mimari desenleri'),
    oneLiner: t(
      'Sunucu işletimini sağlayıcıya bırakan, kullanım ve kapasite planına göre ücretlenen olay tabanlı bileşimler.',
    ),
    prerequisites: [
      t('Sunucusuz (serverless) kavramı'),
      t('HTTP temelleri'),
      t('En az bir bulut sağlayıcısında deneyim'),
    ],
    steps: [
      {
        title: t('1. Olay kaynağını seç'),
        text: t(
          'Sunucusuz bir iş, bir olay tarafından tetiklenir: HTTP isteği, kuyruk mesajı, zamanlayıcı veya dosya yükleme. İlk adım tetikleyiciyi doğru seçmektir; kullanılabilir seçenekler sağlayıcıya göre değişir (API Gateway, S3 olayı, EventBridge, Pub/Sub…).',
        ),
      },
      {
        title: t('2. Tek sorumluluk ilkesi'),
        text: t(
          'Her fonksiyonu küçük ve tek bir iş yapacak şekilde yaz: bir resmi dönüştür, bir satırı doğrula, bir webhook’u yayınla. Büyük fonksiyonlar hızla monolitik sunucu koduna döner.',
        ),
      },
      {
        title: t('3. Durum ve kalıcılık'),
        text: t(
          'Lambda/Cloud Functions stateless’tir. Kalıcı veri için harici servis kullan: DynamoDB, Cosmos DB, S3, Redis. Aynı fonksiyon aynı anda yüzlerce kez çalışabilir; yerel dosya sistemi güvenli değildir.',
        ),
      },
      {
        title: t('4. Hata yönetimi ve tekrar deneme'),
        text: t(
          'Tekrar deneme davranışı tetikleyiciye ve ayarlara bağlıdır; senkron çağrıda istemci sorumlu olabilir. Desteklenen akışlarda DLQ veya hata hedefi yapılandır. Aynı olayın tekrar işlenmesi yan etkiyi çoğaltmayacak şekilde idempotent fonksiyonlar yaz.',
        ),
      },
      {
        title: t('5. Maliyet ve soğuk başlangıç'),
        text: t(
          'Seyrek çağrılan fonksiyonlarda soğuk başlangıç; çalışma zamanı, paket boyutu, ağ ve sağlayıcıya bağlı olarak onlarca milisaniyeden saniyelere uzayabilir. Hazır eşzamanlılık (provisioned concurrency) gecikmeyi düşürebilir, ancak ek maliyet getirir.',
        ),
      },
    ],
    architecture: {
      caption: t('S3 yüklemesini işleyen sunucusuz işlem hattı'),
      flow: [
        t('Kullanıcı dosyayı S3/Blob’a yükler'),
        t('S3 olayı Lambda/Functions’ı tetikler'),
        t('Fonksiyon meta veriyi veritabanına yazar'),
        t('Sıra (SQS/Pub-Sub) başka bir fonksiyonu tetikler'),
        t('CDN, küçük resmi son kullanıcıya sunar'),
      ],
    },
    pitfall: t(
      '“Sunucusuz = ucuz” her zaman doğru değildir. Milyonlarca istek alan bir API’de klasik VM daha ucuz olabilir. Soğuk başlangıç ve dış servis çağrı maliyetleri gözden kaçar.',
    ),
    nextStep: t(
      'Bir resim yükleme uygulaması yaz: kullanıcı yükler → S3 olayı → Lambda küçük resim üretir → API üzerinden döner. Tüm akışı kendin gözlemle.',
    ),
  },
  {
    id: 'gpu-ai-workloads',
    title: t('GPU ve yapay zeka iş yükleri'),
    oneLiner: t(
      'Model eğitimi ve çıkarımı için GPU gücünü doğru büyüklükte, doğru süreyle kiralamak.',
    ),
    prerequisites: [
      t('AI / GPU kategorisi'),
      t('Temel derin öğrenme bilgisi'),
      t('Bulut maliyet modelleri'),
    ],
    steps: [
      {
        title: t('1. VRAM ihtiyacını belirle'),
        text: t(
          'GPU seçiminin anahtarı VRAM’dir (GPU belleği). Yalnızca FP16/BF16 ağırlıkları yaklaşık hesaplandığında 7B model 14 GB, 70B model 140 GB yer ister; nicemleme bunu azaltabilir. Çalışma zamanı, KV önbelleği, bağlam uzunluğu ve toplu işleme ek bellek gerektirir.',
        ),
      },
      {
        title: t('2. Eğitim ve çıkarımı ayır'),
        text: t(
          'Eğitim (training) çoğu iş yükünde çıkarımdan daha uzun sürer ve daha fazla kaynak tüketir. Aynı GPU tipini her ikisinde kullanmak gerekmez; donanımı model boyutu, hassasiyet, gecikme ve aktarım hedeflerine göre ayrı seçebilirsin.',
        ),
      },
      {
        title: t('3. Spot ve rezervasyonu birlikte kullan'),
        text: t(
          'Kontrol noktası alınabilen eğitim işleri kesintiye dayanabiliyorsa spot kaynaklar önemli indirim sağlayabilir. Gecikme ve erişilebilirlik hedefi olan üretim çıkarımında isteğe bağlı veya taahhütlü kapasite gerekebilir. İkisini ayrı işlem hatları olarak planla.',
        ),
      },
      {
        title: t('4. Veri aktarımı ve depolama'),
        text: t(
          'Eğitim verisi yüzlerce GB olabilir. Veriyi işlemle aynı bölgede tutmak bölgeler arası veya internet çıkışını azaltabilir; ücret hizmet yoluna göre değişir. Cloudflare R2 internet çıkışını ücretsiz sunar, ancak istek ve depolama ücretleri ayrıca değerlendirilmelidir.',
        ),
      },
      {
        title: t('5. İzleme ve bütçe'),
        text: t(
          'GPU saatleri hızlıca yüksek faturalara ulaşabilir. Bütçe uyarısı koy (ör. günlük 50 USD); uyarı harcamayı kendiliğinden durdurmaz. Gerekirse ayrıca kaynak kapatma otomasyonu tanımla. Kullanmadığın örnekleri mutlaka sonlandır; unutulan kaynaklar sık görülen maliyet nedenlerindendir.',
        ),
      },
    ],
    architecture: {
      caption: t('Bir yapay zeka ürününün bileşenleri'),
      flow: [
        t('Veri → Object Storage (R2/S3/Blob)'),
        t('Eğitim işlem hattı → spot GPU'),
        t('Model kayıt deposu → Container Registry'),
        t('Çıkarım servisi → küçük GPU / sunucusuz'),
        t('API → kullanıcı isteğini karşılar'),
      ],
    },
    pitfall: t(
      'Büyük modeli ölçmeden 7/24 çalışır durumda bırakmak. Gerekli kopya sayısı ve sunucusuz GPU’nun ekonomik olup olmadığı trafik, model yükleme süresi, gecikme hedefi ve ölçekleme sınırlarına bağlıdır.',
    ),
    nextStep: t(
      'Hugging Face’teki küçük bir modeli (ör. 1-3B) indir, 4-bit nicemleme ile bir L4 GPU’da 10 dakika çalıştır; saatlik maliyeti fatura tahmincisinden kontrol et.',
    ),
  },
] as const
