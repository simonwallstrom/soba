import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalDocument, LegalSection } from "./-components/legal-document";

export const Route = createFileRoute("/_public/privacy")({ component: Privacy });

// Describes what the app actually does; keep it in step with docs/data.md and
// docs/auth-and-households.md when those change.
function Privacy() {
  return (
    <LegalDocument
      summary={
        <p>
          Soba keeps your household’s recipes and meal plan so you can share them with your family.
          We collect only what that needs, never sell it or show ads, and you can have it deleted at
          any time.
        </p>
      }
      title="Privacy policy"
      updated="15 October 2026"
    >
      <LegalSection id="who-we-are" title="Who runs Soba">
        <p>
          Soba is run from Sweden. Who is responsible for your personal data (the “data controller”
          under the EU’s GDPR), and how to reach them, will be listed here before Soba launches
          publicly.
        </p>
      </LegalSection>

      <LegalSection id="data-we-collect" title="What we collect">
        <ul>
          <li>
            <strong>Your account:</strong> the name, email address, and profile photo from the
            Google account you log in with.
          </li>
          <li>
            <strong>Your household:</strong> its name, members, language and unit settings, and its
            invite link.
          </li>
          <li>
            <strong>What you add:</strong> recipes, recipe photos, tags, favorites, and the meal
            plan, along with who added or changed them and when.
          </li>
          <li>
            <strong>Imports:</strong> the web pages and photos you import recipes from.
          </li>
          <li>
            <strong>Technical data:</strong> a login session, and the IP address and browser details
            that come with every request, used for security and to limit abuse.
          </li>
        </ul>
        <p>We don’t use analytics or advertising trackers.</p>
      </LegalSection>

      <LegalSection id="how-we-use-it" title="How we use it">
        <p>
          Only to run Soba for you: to log you in, show your household its recipes and meal plan,
          import recipes, suggest meals, and keep the service secure. The legal basis is our
          agreement with you to provide the service, and our legitimate interest in keeping it
          secure.
        </p>
        <p>
          Your recipes are never used to train AI models, and we don’t sell or share your data for
          marketing.
        </p>
      </LegalSection>

      <LegalSection id="who-else" title="Who else handles it">
        <p>A few providers process data for us, only to run the service:</p>
        <ul>
          <li>
            <strong>Cloudflare</strong> hosts Soba and stores its database and photos. Its AI
            service reads saved recipes to help suggest meals.
          </li>
          <li>
            <strong>Google</strong> handles logging in.
          </li>
          <li>
            <strong>Anthropic</strong> reads the pages and photos you import to turn them into
            recipes. It doesn’t use them to train its models.
          </li>
        </ul>
        <p>
          Some of these providers may process data outside the EU. When they do, they rely on
          safeguards approved by the EU, such as standard contractual clauses or the EU–US Data
          Privacy Framework.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="What your household sees">
        <p>
          Everyone in your household sees its recipes, photos, tags, and meal plan, and the name,
          email address, and photo of each member. Favorites are your own. Anyone with your
          household’s invite link can join it, so share the link only with people you trust; the
          owner can reset it in Settings.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <p>
          We keep your data while you use Soba. Deleting a recipe deletes it and its photo, and
          deleting a household deletes all of its recipes, photos, and meal plan. To have your
          account deleted, contact us and we’ll do it within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="your-device" title="Cookies and your device">
        <p>
          Soba uses one cookie, to keep you logged in. It also saves a copy of your household’s data
          and your display preferences in your browser, so the app opens quickly. Logging out clears
          them. There are no tracking cookies, so there’s no cookie banner.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          You can ask to see, correct, export, or delete your personal data, or object to how we use
          it, using the contact details in “Who runs Soba”, and we’ll answer within a month. If
          you’re unhappy with how we handle your data, you can complain to the Swedish Authority for
          Privacy Protection (
          <a href="https://www.imy.se" rel="noreferrer" target="_blank">
            IMY
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          If this policy changes, we’ll update the date at the top, and tell you in the app if the
          change is significant. See also the <Link to="/terms">terms of use</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
