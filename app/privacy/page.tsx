import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Privacy" };
import { SupportContact } from "@/components/support-contact";
export default function Privacy() {
  return (
    <article className="moro-policy">
      <p className="moro-eyebrow">YOUR INFORMATION</p>
      <h1>
        A little clarity.
        <br />
        <em>About your privacy.</em>
      </h1>
      <p className="policy-intro">
        Moro is the custom print workspace operated by Digital Heroes. This
        notice explains how information moves through the service.
      </p>
      <p className="policy-date">Updated 27 November 2026</p>
      <h2>What you share</h2>
      <p>
        We store your account details, saved designs, uploaded artwork and
        personalisation data. When you create an order, we also store the
        delivery and contact details you enter, order history, proof decisions
        and payment status. Please upload only information and artwork you have
        permission to use.
      </p>
      <h2>Signing in with Google</h2>
      <p>
        If you choose Google sign-in, Google shares your basic identity
        information, including your name, email address and profile picture,
        with our authentication provider, Supabase. We use this information to
        identify your account and let you access your projects. We do not
        request access to your Gmail, Google Drive, contacts or calendar.
      </p>
      <p>
        You can remove Google’s permission in your Google Account’s connections
        settings. Removing that permission does not automatically delete
        projects or order records already saved in Moro.
      </p>
      <h2>How the information is used</h2>
      <p>
        Account information supports sign-in, project ownership and service
        emails. Artwork and personalisation data are used to prepare proofs and
        production files. Delivery information supports order administration.
        Authorised staff can access the records needed to manage orders and
        artwork. Information is not used for advertising or AI model training.
      </p>
      <h2>Services that process information</h2>
      <p>
        Supabase provides authentication, database and file storage. Vercel
        hosts the application. Stripe processes checkout and returns payment
        status; Moro does not store your card number. Google’s email service
        sends account and order messages. These services process information
        under their own privacy notices and may process data in different
        countries.
      </p>
      <h2>Cookies and drafts</h2>
      <p>
        Essential session cookies keep you signed in. The studio stores a
        temporary draft in your browser tab for up to 24 hours so you can return
        after signing in. Saved account projects are stored separately. No
        advertising cookies are required to use this service.
      </p>
      <h2>Keeping and managing your information</h2>
      <p>
        Saved projects and order records remain in the service until removed by
        the operator. To request a copy, correction or deletion of your
        information, contact <SupportContact /> from your account email.
        Requests are handled by the operator; this is not an automated deletion
        service. Some order records may need to be retained for business or
        legal obligations, which the operator will explain when responding.
      </p>
      <h2>Questions</h2>
      <p>
        Contact Digital Heroes at <SupportContact />.{" "}
        <Link href="/terms">Read the service terms</Link>.
      </p>
    </article>
  );
}
