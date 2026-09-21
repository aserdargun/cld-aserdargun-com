import { BadgeDollarSign, CalendarClock, Clock3, Scale, ShieldCheck } from 'lucide-react'

const principles = [
  {
    title: '730 saat / ay',
    text: 'Sürekli çalışan kaynaklar için modellenen aylık tutar 730 saatlik standart kullanım üzerinden hesaplanır.',
    Icon: Clock3,
  },
  {
    title: 'Vergiler hariç USD',
    text: 'Tüm karşılaştırmalar USD cinsindedir; KDV, diğer vergiler ve ödeme kuruluşu masrafları hariçtir.',
    Icon: BadgeDollarSign,
  },
  {
    title: 'Özgün para birimi ve ECB',
    text: 'EUR fiyat korunur. Teklifin doğrulama gününde veya öncesindeki en yakın tarihli ECB EUR/USD kuru kullanılır; 30 günden eski veya ileri tarihli kurla USD toplamı üretilmez.',
    Icon: Scale,
  },
  {
    title: '30 günlük güncellik',
    text: '30 günü aşan fiyat ve ücretsiz katman kayıtları sıralamadan çıkarılır. Aynı süre sınırı döviz kuru için de geçerlidir. Katalog tarihi, tüm kayıtların yeniden doğrulandığı anlamına gelmez.',
    Icon: CalendarClock,
  },
  {
    title: 'Tarihli resmî kaynak',
    text: 'Her fiyat, bölge ve satın alma notu erişim tarihi görünür olan resmî bir kaynağa bağlanır.',
    Icon: ShieldCheck,
  },
] as const

export function Methodology() {
  return (
    <section className="methodology page-section" id="metodoloji" aria-labelledby="methodology-heading">
      <header className="page-section__heading">
        <h2 id="methodology-heading">Metodoloji</h2>
        <p>
          Sonuçlar karşılaştırılabilir ürün ve kullanım bileşenleriyle sınırlıdır; en düşük fiyat her
          zaman operasyonel olarak en uygun hizmet anlamına gelmez.
        </p>
      </header>

      <div className="methodology__principles">
        {principles.map(({ title, text, Icon }) => (
          <section key={title}>
            <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </section>
        ))}
      </div>

      <aside className="methodology__price-basis" role="note">
        <strong>Fiyat tabanı</strong>
        <p>
          Sonuçlar genel liste fiyatı tahminidir; taahhüt, sözleşme indirimi, vergi, destek ve
          lisans maliyetleri uygulanmaz.
        </p>
      </aside>

      <div className="methodology__limits">
        <h3>Karşılaştırma sınırları</h3>
        <p>
          Taahhüt indirimleri, kurumsal pazarlıklar, promosyon kodları, startup kredileri, lisanslar
          ve resmî kaynağı bulunmayan bileşenler toplama eklenmez. Trafik, istek ve yönetim ücretleri
          yalnızca kaynakta doğrulanabildiği ölçüde hesaplanır.
        </p>
        <p>
          “Türkiye’den satın alınabilir” ifadesi araştırma tarihindeki genel hesap açma ve ödeme
          uygunluğunu anlatır; hizmete erişim, kart kabulü, kimlik doğrulaması veya bölgesel kapasite
          için garanti değildir.
        </p>
      </div>
      <p className="learning-system__note">
        Senaryo kapsamları farklıdır: API arka ucu yalnız istek ücretini, statik site yalnız
        depolama ve CDN çıkışını karşılaştırır. GPU belleğinin yeterli olması aynı hız veya
        aynı iş tamamlama süresi anlamına gelmez. 730 saat bir ayın standart model varsayımıdır.
      </p>
    </section>
  )
}
