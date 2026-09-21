import learningSystem from '../data/learning-system.json'

export function LearningSystem() {
  return (
    <section className="page-section learning-system" id="ogrenme-sistemi" aria-labelledby="learning-system-heading">
      <header className="page-section__heading">
        <h2 id="learning-system-heading">aserdargun.com öğrenme sistemi</h2>
        <p>CLD bulut maliyetlerini, LCL yerel çalıştırmayı ele alır. DCL iki uygulamanın ortak karar laboratuvarıdır.</p>
        <p lang="en">CLD covers cloud costs; LCL covers local deployment. DCL is their shared decision laboratory.</p>
      </header>
      <ul className="learning-system__links">
        {learningSystem.links.map((link) => (
          <li key={link.code}>
            <a href={link.href}>{link.label.tr}</a>
            <p>{link.description.tr}</p>
            <p lang="en"><strong>{link.label.en}</strong> — {link.description.en}</p>
          </li>
        ))}
      </ul>
      <p className="learning-system__note">Bağlantılar öğrenme ilişkilerini gösterir. Fiyatlar, senaryo ayarları ve kişisel notlar bu uygulamalar arasında otomatik aktarılmaz.</p>
      <p className="learning-system__note" lang="en">These links describe learning relationships. Prices, scenario settings and personal notes are not automatically transferred between applications.</p>
    </section>
  )
}
