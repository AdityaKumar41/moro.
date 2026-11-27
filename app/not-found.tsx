import Link from "next/link";
export default function NotFound() {
  return (
    <section className="wrap page-section">
      <div className="eyebrow">A LITTLE OFF THE BEATEN PATH</div>
      <h1 className="page-title">
        This page hasn’t
        <br />
        been made yet.
      </h1>
      <Link className="button" href="/products">
        Find your next idea
      </Link>
    </section>
  );
}
