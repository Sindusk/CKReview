// app/privacy/page.tsx — see components/LegalPage.tsx.

import type { Metadata } from "next";
import LegalPage, { CONTACT_URL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — Consistency Kings" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Consistency Kings is a small hobby project. This policy covers every site under
        consistencykings.com that uses the shared Consistency Kings account, including Raid Review
        (review.consistencykings.com) and Stonks (stonks.consistencykings.com). One account and one
        login work across all of them.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Your account:</strong> a username, an account role, and, if you set one, your PIN
          stored only as a salted one-way hash.
        </li>
        <li>
          <strong>Google sign-in:</strong> if you sign in with or link Google, we store your Google
          account&apos;s ID and email address. We ask Google only for your basic profile and email
          address. We never see your Google password, and we don&apos;t keep Google access tokens or
          use them to reach any other Google data.
        </li>
        <li>
          <strong>Login sessions:</strong> a random session token in a cookie on consistencykings.com,
          with the time it was last used. This cookie is what keeps you logged in.
        </li>
        <li>
          <strong>What you put into an app:</strong> for example, statics, raid reviews and the
          character names, pulls and results imported from public Warcraft Logs and FFLogs reports,
          VOD links, or, on Stonks, your portfolio entries.
        </li>
      </ul>

      <h2>What stays in your browser</h2>
      <p>
        If you connect Warcraft Logs or FFLogs, your client ID and their access tokens are kept in
        your browser&apos;s local storage and are never sent to our server. Layout and display
        preferences are stored there too.
      </p>

      <h2>Third parties</h2>
      <p>
        Video playback uses embedded players from YouTube or Twitch, and spell tooltips load a script
        from Wowhead. Those services may set their own cookies under their own policies. We don&apos;t
        run ads or analytics trackers, and we don&apos;t sell or share your data with anyone.
      </p>

      <h2>How long we keep it, and deleting it</h2>
      <p>
        Account data is kept while your account exists. To have your account and its data deleted,
        or to ask what we hold about you, open a request at <a href={CONTACT_URL}>{CONTACT_URL}</a> or
        use the support email shown on Google&apos;s sign-in screen. Logging out deletes that login
        session.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top will change with it.</p>
    </LegalPage>
  );
}
