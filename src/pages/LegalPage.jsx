import "../styles/legal-page.css";

export default function LegalPage({ eyebrow, title, lead, sections }) {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="legal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{lead}</p>
      </section>

      <div className="legal-grid">
        {sections.map((section) => (
          <section className={`legal-card ${section.full ? "full" : ""}`} key={section.heading}>
            <h2>{section.heading}</h2>
            {section.text && <p>{section.text}</p>}
            {section.items && (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
