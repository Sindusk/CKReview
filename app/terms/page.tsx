// app/terms/page.tsx — see components/LegalPage.tsx.

import type { Metadata } from "next";
import LegalPage, { CONTACT_URL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service — Consistency Kings" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms cover every site under consistencykings.com that uses the shared Consistency Kings
        account, including Raid Review and Stonks. By using them you agree to these terms.
      </p>

      <h2>The service</h2>
      <p>
        Consistency Kings is a free hobby project, provided as is, with no warranty and no guarantee
        that it will be available or keep your data. Its analysis is automated and can be wrong: raid
        review calls are a starting point for watching the VOD, and nothing on Stonks is financial
        advice.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your PIN and the Google account you sign in with secure. You&apos;re responsible for what happens under your account.</li>
        <li>Don&apos;t try to get into other people&apos;s accounts or data, or overload, scrape or attack the sites.</li>
        <li>Use the review tools constructively. Don&apos;t use them to harass other players.</li>
      </ul>
      <p>We may suspend accounts that break these rules, and you can ask for your account to be deleted at any time.</p>

      <h2>Not affiliated</h2>
      <p>
        World of Warcraft is a trademark of Blizzard Entertainment, and Final Fantasy XIV of Square
        Enix. Consistency Kings is not affiliated with them, with Warcraft Logs or FFLogs, or with
        Google.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If these terms change, the date at the top will change with them. Questions go
        to <a href={CONTACT_URL}>{CONTACT_URL}</a>.
      </p>
    </LegalPage>
  );
}
