import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that apply when you use ${LEGAL.brand}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms are a contract between you and ${LEGAL.entity} ("${LEGAL.brand}", "we", "us"). By using ${LEGAL.site} (the "Site"), applying, submitting a brief, joining Earn, or becoming an ambassador, you agree to them and to our Privacy Policy. If you don't agree, don't use the Site.`}
    >
      <Section title="1. Who can use the Site">
        <p>
          You must be at least 13. If you are under 18 you confirm that a
          parent or guardian has reviewed these terms and our{" "}
          <Link href="/privacy">Privacy Policy</Link> and permits you to apply.
          Earn recording projects are for adults (18+) unless the project
          expressly allows minors with documented guardian consent. Companies
          confirm they are authorised to act for their business.
        </p>
      </Section>

      <Section title="2. What we do, and what we don't promise">
        <p>
          {LEGAL.brand} introduces students to companies, and runs Earn
          projects that pay contributors to produce data. We hand-screen
          applicants and briefs, but:
        </p>
        <ul>
          <li>We do not guarantee any interview, placement, job, internship, project, income or amount of work.</li>
          <li>Submitting an application or sign-up does not create a relationship of employment with us or with any company.</li>
          <li>We are not a party to any arrangement between a student and a company beyond making the introduction, and we do not guarantee the quality, safety or lawfulness of either side.</li>
        </ul>
      </Section>

      <Section title="3. Accuracy of what you submit">
        <p>
          Everything you submit must be true, accurate and yours to share. Do
          not impersonate anyone or submit someone else&apos;s information
          without their permission. We may reject or remove submissions and
          accounts that are inaccurate, duplicated or abusive.
        </p>
      </Section>

      <Section title="4. Your content and our licence">
        <p>
          You keep ownership of what you submit (résumés, answers, briefs). You
          grant {LEGAL.brand} a non-exclusive, worldwide licence to use, store,
          reproduce and share it as needed to operate the Site, review and
          match applicants, and as described in our Privacy Policy. Recordings
          made for Earn are governed by the licence in section 6.
        </p>
      </Section>

      <Section title="5. For students and companies">
        <ul>
          <li>
            <strong>Companies</strong> are solely responsible for complying
            with all employment, wage-and-hour, intern-classification, child
            labour and work-permit laws, and for the safety of any student they
            engage. Companies must not ask students for payment, and must not
            engage minors in work that is unlawful for their age.
          </li>
          <li>
            <strong>Students</strong> are responsible for deciding whether an
            opportunity is right for them, and for any school, parental or
            legal permissions needed to take it.
          </li>
          <li>
            Arrangements made between students and companies are between them.
          </li>
        </ul>
      </Section>

      <Section title="6. Earn program">
        <ul>
          <li>
            <strong>Independent contractor.</strong> Earn participants are
            independent contractors, not employees. You are responsible for
            your own taxes and equipment.
          </li>
          <li>
            <strong>Pay.</strong> Pay rates, quality requirements and payment
            timing are stated for each project. We pay for work that is
            accepted under that project&apos;s quality standards; we may reject
            submissions that do not meet them. Eligibility screening does not
            guarantee that a project will open to you.
          </li>
          <li>
            <strong>Recording and licence.</strong> By submitting a recording
            you confirm you are entitled to make and submit it and you grant{" "}
            {LEGAL.brand} and its customers a perpetual, worldwide, royalty-free
            licence to use, reproduce, process, analyse and distribute it,
            including to train and evaluate AI models. The specific scope and
            payment for each project will be confirmed before you start, and
            you may decline to take part.
          </li>
          <li>
            <strong>Privacy of others.</strong> Only record yourself and places
            where you have the right to record. Keep other people, especially
            children, out of frame unless each has consented (and a guardian
            has consented for any minor). Do not capture personal documents,
            screens, addresses or other sensitive information.
          </li>
          <li>
            <strong>Safety.</strong> Do not do anything unsafe or unlawful to
            complete a task. You participate at your own risk and are
            responsible for safe conduct in your own home or other location.
          </li>
        </ul>
      </Section>

      <Section title="7. Ambassador (referral) program">
        <ul>
          <li>Referral rewards are paid only when the referred person meets the criteria published on the Earn referral page (for example, qualifying or being hired) and the reward is then confirmed by us. Rewards are not guaranteed and may be changed or ended at any time for future referrals.</li>
          <li>Refer only people who would reasonably welcome the introduction. No spam, misleading claims, incentives for false sign-ups, or self-referrals. If you are paid for promoting us you must disclose that relationship as the law requires.</li>
          <li>We may withhold or reclaim rewards obtained through fraud or breach of these terms.</li>
        </ul>
      </Section>

      <Section title="8. Acceptable use">
        <p>
          Do not misuse the Site: no unlawful, fraudulent, harassing or
          infringing content; no attempts to access admin areas or other
          people&apos;s data; no scraping, automated bulk submissions, or
          interfering with the Site&apos;s operation; and no submitting
          malware.
        </p>
      </Section>

      <Section title="9. Intellectual property">
        <p>
          The Site, its design, text, logos and software belong to{" "}
          {LEGAL.entity} or its licensors. We grant you a limited, revocable
          licence to use the Site for its intended purpose. All other rights
          are reserved.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          THE SITE AND OUR SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS
          AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SITE WILL BE
          UNINTERRUPTED OR ERROR-FREE, OR THAT ANY STUDENT, COMPANY, PROJECT OR
          OPPORTUNITY WILL MEET YOUR EXPECTATIONS.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, {LEGAL.entity.toUpperCase()}{" "}
          AND ITS OWNERS, OFFICERS, EMPLOYEES AND CONTRACTORS WILL NOT BE LIABLE
          FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES,
          OR FOR LOST PROFITS, DATA OR OPPORTUNITIES, ARISING FROM YOUR USE OF
          THE SITE OR ANY DEALINGS WITH OTHER USERS. OUR TOTAL LIABILITY FOR
          ANY CLAIM RELATING TO THE SITE WILL NOT EXCEED THE GREATER OF (A) THE
          AMOUNT WE HAVE PAID YOU IN THE 12 MONTHS BEFORE THE CLAIM AND (B)
          US$100. Some jurisdictions do not allow certain limitations, so some
          of this may not apply to you. Nothing in these terms limits liability
          that cannot be limited by law.
        </p>
      </Section>

      <Section title="12. Indemnity">
        <p>
          To the extent permitted by law, you will indemnify and hold harmless{" "}
          {LEGAL.entity} from claims, losses and expenses (including reasonable
          legal fees) arising from your content, your breach of these terms, or
          your violation of law or of anyone&apos;s rights. This section does
          not apply to users under 18.
        </p>
      </Section>

      <Section title="13. Termination">
        <p>
          We may suspend or end your access, reject submissions, or close any
          program at any time. You may stop using the Site and ask us to delete
          your information at any time.
        </p>
      </Section>

      <Section title="14. Governing law and disputes">
        <p>
          These terms are governed by the laws of the State of California,
          without regard to conflict-of-law rules. Before filing a claim, you
          agree to contact us at{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and try to
          resolve the dispute informally for 30 days. Any claim that is not
          resolved must be brought in the state or federal courts located in
          Los Angeles County, California, and you consent to their
          jurisdiction.
        </p>
      </Section>

      <Section title="15. Changes and general terms">
        <p>
          We may update these terms; the version posted here with the latest
          effective date applies, and continued use means you accept it. If a
          provision is unenforceable the rest remain in effect. These terms and
          the Privacy Policy are our entire agreement with you about the Site.
          You may not assign them; we may.
        </p>
      </Section>

      <Section title="16. Contact">
        <p>
          {LEGAL.entity}, {LEGAL.location}.{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        </p>
      </Section>
    </LegalPage>
  );
}
