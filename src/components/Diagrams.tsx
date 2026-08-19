import type { ConceptLayer } from '../data/education'

/**
 * Saf SVG ile çizilmiş kavramsal diyagramlar.
 * Hiçbir dış kaynak/ikon seti gerektirmez; erişilebilirlik için role/title ile
 * birlikte gelir.
 */

interface ResponsibilityPyramidProps {
  layers: readonly ConceptLayer[]
}

/**
 * Sorumluluk payı piramidi.
 * Her katmanda "sen yönetirsin" (sol) ile "sağlayıcı yönetir" (sağ) oranını
 * görsel olarak gösterir.
 */
export function ResponsibilityPyramid({ layers }: ResponsibilityPyramidProps) {
  return (
    <div className="diagram-card" role="img" aria-label="Bulut sorumluluk payı piramidi">
      <svg viewBox="0 0 480 320" className="diagram-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="userFill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#c96b10" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#c96b10" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="providerFill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#075fe4" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#075fe4" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <text x="20" y="22" className="diagram-axis-label">Sen yönetirsin</text>
        <text x="460" y="22" className="diagram-axis-label" textAnchor="end">Sağlayıcı yönetir</text>

        {layers.map((layer, index) => {
          const rowHeight = 56
          const gap = 12
          const y = 40 + index * (rowHeight + gap)
          const userWidth = (layer.userResponsibility / 100) * 440
          const providerWidth = 440 - userWidth
          return (
            <g key={layer.id}>
              <rect
                x={20}
                y={y}
                width={userWidth}
                height={rowHeight}
                fill="url(#userFill)"
                rx={6}
              />
              <rect
                x={20 + userWidth}
                y={y}
                width={providerWidth}
                height={rowHeight}
                fill="url(#providerFill)"
                rx={6}
              />
              <text
                x={240}
                y={y + rowHeight / 2 + 5}
                className="diagram-row-label"
                textAnchor="middle"
              >
                {layer.shortLabel} — {layer.title}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="diagram-caption">
        Yukarı çıktıkça senden sorumluluk azalır: SaaS’te neredeyse sadece kullanırsın,
        on-prem’de her şey sana aittir.
      </p>
    </div>
  )
}

interface CategoryIconProps {
  categoryId: string
  title: string
}

/**
 * Servis kategorisi için küçük, anlamlı bir SVG ikon.
 * Diyagram kartlarında başlık yanında kullanılır.
 */
export function CategoryIcon({ categoryId, title }: CategoryIconProps) {
  const common = {
    width: 56,
    height: 56,
    viewBox: '0 0 56 56',
    role: 'img',
    'aria-label': title,
    xmlns: 'http://www.w3.org/2000/svg',
  }

  switch (categoryId) {
    case 'compute':
      return (
        <svg {...common}>
          <rect x="8" y="14" width="40" height="12" rx="2" fill="#075fe4" />
          <rect x="8" y="30" width="40" height="12" rx="2" fill="#0b223f" />
          <circle cx="14" cy="20" r="1.6" fill="#fff" />
          <circle cx="14" cy="36" r="1.6" fill="#fff" />
          <rect x="20" y="18" width="22" height="4" rx="1" fill="#fff" opacity="0.4" />
          <rect x="20" y="34" width="22" height="4" rx="1" fill="#fff" opacity="0.4" />
        </svg>
      )
    case 'object-storage':
      return (
        <svg {...common}>
          <ellipse cx="28" cy="14" rx="18" ry="5" fill="#075fe4" />
          <path d="M10 14v12c0 2.8 8 5 18 5s18-2.2 18-5V14" fill="#0b223f" />
          <path d="M10 26v12c0 2.8 8 5 18 5s18-2.2 18-5V26" fill="#075fe4" opacity="0.8" />
          <path d="M10 38v6c0 2.8 8 5 18 5s18-2.2 18-5v-6" fill="#0b223f" />
        </svg>
      )
    case 'managed-database':
      return (
        <svg {...common}>
          <ellipse cx="28" cy="14" rx="16" ry="5" fill="#138a55" />
          <path d="M12 14v28c0 2.8 7.2 5 16 5s16-2.2 16-5V14" fill="#138a55" opacity="0.85" />
          <ellipse cx="28" cy="22" rx="16" ry="5" fill="#fff" opacity="0.18" />
          <ellipse cx="28" cy="32" rx="16" ry="5" fill="#fff" opacity="0.12" />
        </svg>
      )
    case 'serverless':
      return (
        <svg {...common}>
          <path
            d="M40 10c-3 0-5 1.5-7 4l-13 18c-2.5 3.5-5 5-8 5h-4l4 5h4c3 0 5-1.5 7-4l13-18c2.5-3.5 5-5 8-5h4l-4-5h-4z"
            fill="#c96b10"
          />
          <circle cx="14" cy="46" r="2" fill="#075fe4" />
          <circle cx="24" cy="46" r="2" fill="#138a55" />
          <circle cx="34" cy="46" r="2" fill="#c96b10" />
        </svg>
      )
    case 'cdn-network':
      return (
        <svg {...common}>
          <circle cx="28" cy="28" r="6" fill="#075fe4" />
          <circle cx="10" cy="14" r="4" fill="#0b223f" />
          <circle cx="46" cy="14" r="4" fill="#0b223f" />
          <circle cx="10" cy="42" r="4" fill="#0b223f" />
          <circle cx="46" cy="42" r="4" fill="#0b223f" />
          <line x1="28" y1="28" x2="10" y2="14" stroke="#075fe4" strokeWidth="1.5" />
          <line x1="28" y1="28" x2="46" y2="14" stroke="#075fe4" strokeWidth="1.5" />
          <line x1="28" y1="28" x2="10" y2="42" stroke="#075fe4" strokeWidth="1.5" />
          <line x1="28" y1="28" x2="46" y2="42" stroke="#075fe4" strokeWidth="1.5" />
        </svg>
      )
    case 'kubernetes':
      return (
        <svg {...common}>
          <polygon
            points="28,6 47,17 47,39 28,50 9,39 9,17"
            fill="none"
            stroke="#075fe4"
            strokeWidth="2"
          />
          <polygon
            points="28,14 40,21 40,35 28,42 16,35 16,21"
            fill="#075fe4"
            opacity="0.15"
          />
          <circle cx="28" cy="28" r="4" fill="#075fe4" />
          <circle cx="16" cy="21" r="2.5" fill="#0b223f" />
          <circle cx="40" cy="21" r="2.5" fill="#0b223f" />
          <circle cx="16" cy="35" r="2.5" fill="#0b223f" />
          <circle cx="40" cy="35" r="2.5" fill="#0b223f" />
          <circle cx="28" cy="14" r="2.5" fill="#0b223f" />
          <circle cx="28" cy="42" r="2.5" fill="#0b223f" />
        </svg>
      )
    case 'gpu-ai':
      return (
        <svg {...common}>
          <rect x="8" y="18" width="40" height="20" rx="2" fill="#0b223f" />
          <rect x="8" y="14" width="40" height="4" fill="#075fe4" />
          <text
            x="28"
            y="33"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize="9"
            fill="#fff"
            fontWeight="700"
          >
            GPU
          </text>
          <circle cx="14" cy="14" r="1.5" fill="#c96b10" />
          <circle cx="42" cy="14" r="1.5" fill="#c96b10" />
          <line x1="20" y1="38" x2="20" y2="46" stroke="#0b223f" strokeWidth="2" />
          <line x1="36" y1="38" x2="36" y2="46" stroke="#0b223f" strokeWidth="2" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="10" y="10" width="36" height="36" rx="4" fill="#075fe4" />
        </svg>
      )
  }
}

interface SavingsBarProps {
  /** 0-100 tasarruf oranı */
  savings: number
  /** Etiket, kart başlığında görünür */
  label: string
}

/**
 * Tasarruf oranını yatay çubuk olarak gösterir.
 * %0 = on-demand taban çizgisi, %100 = tamamen ücretsiz.
 */
export function SavingsBar({ savings, label }: SavingsBarProps) {
  const clamped = Math.max(0, Math.min(100, savings))
  return (
    <div
      className="diagram-card diagram-card--inline"
      role="img"
      aria-label={`${label}: yüzde ${clamped} göreli tasarruf`}
    >
      <div className="savings-bar">
        <div
          className="savings-bar__fill"
          style={{ width: `${clamped}%` }}
          data-testid={`savings-bar-${label}`}
        />
        <span className="savings-bar__label">{label}</span>
        <span className="savings-bar__value">%{clamped}</span>
      </div>
    </div>
  )
}

interface LatencyMapProps {
  /** Türkiye'den bölgelere yaklaşık milisaniye cinsinden gecikme */
  regions: ReadonlyArray<{ id: string; label: string; ms: number }>
}

/**
 * Türkiye’den bölgelere basit bir gecikme görselleştirmesi.
 * Dünya haritası yerine sütun grafiği: mesafe arttıkça çubuk uzar.
 */
export function LatencyMap({ regions }: LatencyMapProps) {
  const max = Math.max(...regions.map((region) => region.ms), 1)
  return (
    <div className="diagram-card" role="img" aria-label="Türkiye'den bölgelere yaklaşık gecikme">
      <svg viewBox="0 0 480 220" className="diagram-svg" xmlns="http://www.w3.org/2000/svg">
        <text x="20" y="22" className="diagram-axis-label">Türkiye (İstanbul) → bölge</text>
        {regions.map((region, index) => {
          const barWidth = (region.ms / max) * 360
          const y = 40 + index * 28
          return (
            <g key={region.id}>
              <text x={20} y={y + 14} className="diagram-row-label-small">{region.label}</text>
              <rect
                x={140}
                y={y + 4}
                width={barWidth}
                height={16}
                rx={3}
                fill="#075fe4"
                opacity="0.85"
              />
              <text
                x={140 + barWidth + 6}
                y={y + 16}
                className="diagram-row-label-small"
                fill="#0b223f"
              >
                ~{region.ms} ms
              </text>
            </g>
          )
        })}
        <text x={20} y={210} className="diagram-axis-label">
          Gösterilen değerler yaklaşıktır; gerçek gecikme sağlayıcı ve yola göre değişir.
        </text>
      </svg>
    </div>
  )
}
