import { locale, t } from '../i18n'
import learningSystem from '../data/learning-system.json'

export function LearningSystem() {
  return (
    <section
      className="page-section learning-system"
      id="ogrenme-sistemi"
      aria-labelledby="learning-system-heading"
    >
      <header className="page-section__heading">
        <h2 id="learning-system-heading">{t('aserdargun.com öğrenme sistemi')}</h2>
        <p>
          {t(
            'CLD bulut maliyetlerini, LCL yerel çalıştırmayı ele alır. DCL iki uygulamanın ortak karar laboratuvarıdır.',
          )}
        </p>
      </header>
      <ul className="learning-system__links">
        {learningSystem.links.map((link) => (
          <li key={link.code}>
            <a
              href={
                link.code === 'portfolio'
                  ? `https://aserdargun.com/${locale === 'tr' ? 'tr/' : ''}`
                  : link.code === 'dcl'
                    ? `${link.href}?lang=${locale}`
                    : `${link.href}${locale}/`
              }
            >
              {link.label[locale]}
            </a>
            <p>{link.description[locale]}</p>
          </li>
        ))}
      </ul>
      <p className="learning-system__note">
        {t(
          'Bağlantılar öğrenme ilişkilerini gösterir. Fiyatlar, senaryo ayarları ve kişisel notlar bu uygulamalar arasında otomatik aktarılmaz.',
        )}
      </p>
    </section>
  )
}
