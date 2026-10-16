import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalDocument, LegalSection } from "./-components/legal-document";

export const Route = createFileRoute("/_public/terms")({ component: Terms });

function Terms() {
  return (
    <LegalDocument
      summary={
        <p>
          Soba is a recipe organizer for families, in early access. Your recipes stay yours. Use it
          kindly, share invite links only with people you trust, and know that things may still
          change while we build it.
        </p>
      }
      title="Terms of use"
      updated="16 October 2026"
    >
      <LegalSection id="the-service" title="The service">
        <p>
          Soba lets a household save recipes, plan meals, and share them. It’s run from Sweden. By
          using Soba you agree to these terms and to how we handle data, as described in the{" "}
          <Link to="/privacy">privacy policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="early-access" title="Early access">
        <p>
          Soba is invite-only and still being built. Features may change or be removed, and the
          service may sometimes be unavailable. In rare cases, data may need to be reset while Soba
          is in early access; we’ll try to warn you first. It’s free for now, and if that changes
          we’ll tell you before you pay anything.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="Your account and household">
        <ul>
          <li>You log in with a Google account, and you must be at least 13 years old.</li>
          <li>
            An account belongs to one household at a time. The person who creates a household is its
            owner and manages its name, invite link, and members.
          </li>
          <li>
            Anyone with a household’s invite link can join it. You’re responsible for who you share
            it with.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="your-content" title="Your content">
        <p>
          The recipes, photos, and notes you add are yours. You give us permission to store,
          process, and show them to your household, only to run Soba. That includes reading them
          with AI to import recipes.
        </p>
        <p>
          Only add content you have the right to use. Importing a recipe from a website is for your
          household’s own use; don’t use Soba to republish other people’s work.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>Don’t use Soba to:</p>
        <ul>
          <li>break the law or infringe anyone’s rights,</li>
          <li>upload anything harmful, hateful, or sexual,</li>
          <li>try to access other households’ data, or disrupt or overload the service.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ending" title="Leaving and ending">
        <p>
          You can leave your household or delete it at any time in Settings, and ask us to delete
          your account. We may suspend or close accounts that break these terms. If we ever shut
          Soba down, we’ll give you notice and a way to export your recipes.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Liability">
        <p>
          Soba is provided as it is. We work to keep it reliable and your data safe, but we can’t
          promise it will always be available or free of errors. Check recipes yourself, especially
          imported or converted ones, for allergens, amounts, and cooking times. As far as the law
          allows, we aren’t liable for indirect losses from using Soba. Nothing here limits rights
          you have as a consumer.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Law and contact">
        <p>
          These terms are governed by Swedish law. If they change significantly, we’ll tell you in
          the app before the change applies. Contact details are in the{" "}
          <Link hash="who-we-are" to="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
