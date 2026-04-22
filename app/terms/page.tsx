import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SnapShoot · Terms of Service',
  description: 'SnapShoot Terms of Service'
};

const sections = [
  {
    heading: '1. Using the Service',
    body: 'SnapShoot is a free web-based game, and by using it you agree to these terms.'
  },
  {
    heading: '2. User Responsibilities',
    body: 'Users must play in a lawful and fair manner. Cheating or harming others is prohibited.'
  },
  {
    heading: '3. Intellectual Property',
    body: 'All SnapShoot content, design, and code are protected by copyright law. Unauthorized copying, distribution, or modification is prohibited.'
  },
  {
    heading: '4. Disclaimer',
    body: 'This game is provided "as is." The developer is not liable for damages arising from its use.'
  },
  {
    heading: '5. Changes to Terms',
    body: 'These terms may change without prior notice, and updates become effective when posted.'
  },
  {
    heading: '6. Contact',
    body: 'For questions about these terms, please use GitHub Issues.'
  }
];

export default function TermsPage() {
  return (
    <main className="policy-shell">
      <h1>SnapShoot Terms of Service</h1>
      <p className="policy-updated">Last updated: November 14, 2025</p>
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
    </main>
  );
}
