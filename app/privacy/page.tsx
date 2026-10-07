import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${LEGAL.brand} collects, uses and shares personal information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This policy explains what personal information ${LEGAL.entity} ("${LEGAL.brand}", "we", "us") collects through ${LEGAL.site} (the "Site"), including our student and company funnels and our Earn program, how we use it, and the choices you have.`}
    >
      <Section title="1. Information we collect">
        <p>
          <strong>Information you give us.</strong> When you apply, submit a
          brief, sign up for Earn, or become an ambassador, we collect what you
          enter, which may include:
        </p>
        <ul>
          <li>
            Contact details: name, email address, phone number, city or region.
          </li>
          <li>
            Student applications: school, grade or year, interests, skills,
            availability, written answers, and an optional résumé or other
            attachment.
          </li>
          <li>
            Company briefs: your name, company, role details, and budget or
            scope information.
          </li>
          <li>
            Earn sign-ups: age, device type and model, eligibility answers,
            consent and guardian-consent answers, and referral information. For
            speech projects we may also ask for sex, race or ethnicity, accent,
            first language and region. These are sensitive details, are used
            only to match you to projects that require them.
          </li>
          <li>
            Earn recordings: if you are accepted onto a project, the video,
            audio or voice recordings you submit, which may show or capture you
            and your home environment.
          </li>
          <li>
            Referrals: if you refer someone, the details you provide about
            them. Only refer people who would expect to hear from us.
          </li>
        </ul>
        <p>
          <strong>Information collected automatically.</strong> We use Vercel
          Analytics to measure aggregate traffic and performance. It does not
          use advertising cookies. Our hosting provider also logs technical
          data such as IP address, browser type and request times for security
          and reliability. Your browser stores form drafts locally on your
          device so you can resume an unfinished application; this stays on
          your device until you submit or clear it.
        </p>
        <p>
          <strong>Email verification.</strong> We email you a one-time code to
          confirm you own the address you enter.
        </p>
      </Section>

      <Section title="2. How we use information">
        <ul>
          <li>To review applications, screen candidates and match students with companies.</li>
          <li>To run Earn projects, review recordings for quality, and pay contributors and ambassadors.</li>
          <li>To contact you about your application, projects and payments.</li>
          <li>To verify email addresses, prevent fraud and abuse, and keep the Site secure.</li>
          <li>To understand how the Site is used and improve it.</li>
          <li>To comply with law and enforce our Terms.</li>
        </ul>
        <p>
          <strong>AI-assisted review.</strong> We use third-party AI models to
          help summarise résumés and applications, tag skills, and rank
          candidates for a search. The text of an application may be sent to
          the AI provider for that purpose. People at {LEGAL.brand} review the
          results; we do not make final matching or hiring decisions solely by
          automated means.
        </p>
      </Section>

      <Section title="3. How we share information">
        <p>
          We do not sell your personal information for money. We share it as
          follows:
        </p>
        <ul>
          <li>
            <strong>Companies.</strong> If we consider you for a role, we may
            share your application details and résumé with the relevant
            company.
          </li>
          <li>
            <strong>Service providers</strong> that process data on our behalf:
            Supabase (database and storage), Vercel (hosting and analytics),
            Resend (email delivery), and our AI model provider (see above).
          </li>
          <li>
            <strong>Earn customers.</strong> Earn recordings and associated
            metadata (such as age range, accent or region) may be delivered or
            licensed to AI developers and research customers for model
            training, as described in the Earn project terms you agree to
            before you record. We do not give them your name or contact details
            unless you agree.
          </li>
          <li>
            <strong>Legal and safety.</strong> To comply with law or legal
            process, protect rights and safety, or in connection with a merger,
            financing or sale of our business.
          </li>
        </ul>
      </Section>

      <Section title="4. Retention">
        <p>
          We keep application information for as long as needed to consider you
          for opportunities and for a reasonable period afterwards, and
          recordings and payment records for as long as required by the
          relevant project, our contracts and tax and legal obligations. You
          can ask us to delete your information at any time (see section 7);
          we will do so unless we must keep it by law.
        </p>
      </Section>

      <Section title="5. Security">
        <p>
          We use access controls, encrypted connections and restricted admin
          access. No system is perfectly secure, so we cannot guarantee
          absolute security. If a breach affects you we will notify you as
          required by law.
        </p>
      </Section>

      <Section title="6. Children and teens">
        <p>
          The Site is not directed to children under 13 and we do not knowingly
          collect their information. If you are under 13, do not submit
          anything. If we learn we have collected information from a child
          under 13 we will delete it.
        </p>
        <p>
          People aged 13 to 17 may apply for student opportunities only with a
          parent or guardian&apos;s permission. Earn projects that involve
          recording require participants to be 18 or older, except where a
          project expressly allows minors with documented guardian consent. A
          parent or guardian may contact us at any time to review or delete a
          minor&apos;s information.
        </p>
      </Section>

      <Section title="7. Your choices and rights">
        <p>
          You can ask us to access, correct or delete your personal
          information, or to stop contacting you, by emailing{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We may need to
          verify your identity first.
        </p>
        <p>
          <strong>California residents.</strong> Under the CCPA/CPRA you have
          the right to know what personal information we collect, use and
          disclose; to request deletion or correction; to opt out of the
          &quot;sale&quot; or &quot;sharing&quot; of personal information; to
          limit the use of sensitive personal information; and not to be
          discriminated against for exercising these rights. We do not use
          your information for cross-context behavioural advertising. You may
          use an authorised agent to submit requests on your behalf.
        </p>
        <p>
          Residents of other states and countries may have similar rights;
          email us and we will honour them where the law applies.
        </p>
      </Section>

      <Section title="8. International users">
        <p>
          We are based in the United States and our providers may process data
          there and elsewhere. By using the Site you understand your
          information may be transferred to and processed in the United
          States.
        </p>
      </Section>

      <Section title="9. Changes">
        <p>
          We may update this policy. We will post the new version here with a
          new effective date and, for material changes, take reasonable steps
          to tell you.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          {LEGAL.entity}, {LEGAL.location}.{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        </p>
      </Section>
    </LegalPage>
  );
}
