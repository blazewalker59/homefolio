export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer mt-24 px-4 pb-12 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col gap-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p className="island-kicker m-0">Colophon</p>
            <p className="m-0 font-serif text-base italic text-[var(--sea-ink)]">
              A field journal for the home you live in.
            </p>
          </div>

          <p className="m-0 text-xs uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
            &copy; {year} &middot; Homefolio
          </p>
        </div>
      </div>
    </footer>
  );
}
