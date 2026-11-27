/** Only configured public business contact is shown on the legal pages. */
export function SupportContact() {
  const email = process.env.SUPPORT_EMAIL?.trim();
  if (!email || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))
    return (
      <span>
        Contact the store operator using the details supplied with your order.
      </span>
    );
  return <a href={`mailto:${email}`}>{email}</a>;
}
