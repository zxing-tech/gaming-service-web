import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SnapShoot · Privacy Policy',
  description: 'SnapShoot Privacy Policy'
};

export default function PrivacyPage() {
  return (
    <main className="policy-shell">
      <h1>SnapShoot Privacy Policy</h1>
      <p className="policy-updated">Last updated: November 14, 2025</p>

      <section>
        <h2>1. Information We Collect</h2>
        <p>
          <strong>SnapShoot does not collect any personal information.</strong>
        </p>
        <ul>
          <li>No sign-up required</li>
          <li>No login information collected</li>
          <li>No email address collected</li>
          <li>No payment information collected</li>
        </ul>
      </section>

      <section>
        <h2>2. Game Data</h2>
        <p>Game progress is stored only in browser local storage and is not sent to external servers.</p>
      </section>

      <section>
        <h2>3. Cookies and Tracking</h2>
        <p>We do not use ad tracking, analytics tools, or cookies.</p>
      </section>

      <section>
        <h2>4. Third-Party Sharing</h2>
        <p>Because we collect no personal data, there is no data to share with third parties.</p>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>Game data is stored on your device only. Clearing browser data will remove all records.</p>
      </section>

      <section>
        <h2>6. Children's Privacy</h2>
        <p>The game is available to all ages, and no personal data is collected.</p>
      </section>

      <section>
        <h2>7. Policy Updates</h2>
        <p>We may update this policy when needed. Any changes will be posted on this page.</p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Questions about this policy:{' '}
          <a href="https://github.com/zxing-tech/gaming-service-web/issues">
            github.com/zxing-tech/gaming-service-web/issues
          </a>{' '}
          (maintainer: Aravind Ramachandran).
        </p>
      </section>
    </main>
  );
}
