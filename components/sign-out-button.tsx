export function SignOutButton() {
  return (
    <form action="/api/logout" method="post" className="signOutForm">
      <button className="textButton" type="submit">
        Sign out
      </button>
    </form>
  );
}
