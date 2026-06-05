import "../styles/footer.css";

const footerGroups = [
  {
    title: "Company",
    links: [
      { label: "About", page: "about" },
      { label: "Contact", page: "contact" },
      { label: "Gym Partner", page: "gym-partner" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Privacy Policy", page: "privacy-policy" },
      { label: "Terms & Conditions", page: "terms-conditions" },
      { label: "Refund Policy", page: "refund-policy" },
      { label: "Delivery Policy", page: "delivery-policy" },
    ],
  },
  {
    title: "Nutrition",
    links: [
      { label: "Nutrition Disclaimer", page: "nutrition-disclaimer" },
      { label: "Monthly Plans", page: "monthly-plans" },
      { label: "WhatsApp Support", page: "contact" },
    ],
  },
];

export default function Footer({ setPage }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <img
          src="/nutriblend-logo.svg"
          alt=""
          loading="lazy"
          decoding="async"
          width="72"
          height="72"
        />
        <div>
          <strong>NUTRIBLEND</strong>
          <p>Fresh fitness nutrition, subscriptions, delivery tracking, and gym partnerships.</p>
        </div>
      </div>

      <div className="site-footer-links">
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3>{group.title}</h3>
            {group.links.map((link) => (
              <button type="button" key={link.label} onClick={() => setPage?.(link.page)}>
                {link.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}
