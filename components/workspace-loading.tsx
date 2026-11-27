export function WorkspaceSkeleton({ studio = false }: { studio?: boolean }) {
  return (
    <div
      className={
        "workspace-skeleton " +
        (studio ? "skeleton-studio" : "skeleton-projects")
      }
      role="status"
      aria-label={
        studio ? "Loading your design studio" : "Loading your projects"
      }
      aria-busy="true"
    >
      <span className="sr-only">
        {studio ? "Opening your studio…" : "Loading your projects…"}
      </span>
      <div className="skeleton-appbar">
        <i className="skeleton-block" />
        <i className="skeleton-block" />
        <i className="skeleton-block" />
      </div>
      <div className="skeleton-body">
        <aside>
          <i className="skeleton-block" />
          {[1, 2, 3, 4].map((n) => (
            <i key={n} className="skeleton-block" />
          ))}
        </aside>
        <div className="skeleton-content">
          {studio ? (
            <>
              <i className="skeleton-block skeleton-tools" />
              <i className="skeleton-block skeleton-art" />
            </>
          ) : (
            <>
              <i className="skeleton-block skeleton-heading" />
              <div className="skeleton-cards">
                {[1, 2, 3].map((n) => (
                  <i key={n} className="skeleton-block" />
                ))}
              </div>
              <i className="skeleton-block skeleton-row" />
              <i className="skeleton-block skeleton-row" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export function AuthSkeleton() {
  return (
    <div
      className="auth-skeleton"
      role="status"
      aria-label="Loading account form"
      aria-busy="true"
    >
      <div className="skeleton-block" />
      <section>
        {[1, 2, 3, 4].map((n) => (
          <i className="skeleton-block" key={n} />
        ))}
      </section>
    </div>
  );
}
