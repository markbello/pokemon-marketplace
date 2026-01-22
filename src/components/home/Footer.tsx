export default function Footer() {
  return (
    <footer className="-mt-8 flex flex-col items-center justify-between gap-4 bg-background pt-6 text-xs text-muted-foreground md:flex-row">
      <span>Copyright © 2026 Kado.io. All rights reserved.</span>
      <div className="flex items-center gap-3">
        <button type="button" className="hover:text-foreground transition">
          Terms &amp; Conditions
        </button>
        <span>|</span>
        <button type="button" className="hover:text-foreground transition">
          Privacy
        </button>
        <span>|</span>
        <button type="button" className="hover:text-foreground transition">
          Cookie Preference
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span>Global - English</span>
        <span>•</span>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">f</span>
          <span aria-hidden="true">𝕏</span>
          <span aria-hidden="true">▶</span>
          <span aria-hidden="true">◎</span>
        </div>
      </div>
    </footer>
  );
}
