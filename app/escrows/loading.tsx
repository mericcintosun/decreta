export default function EscrowDeskLoading() {
  return (
    <div className="decreta-ruled">
      <div className="decreta-rise mx-auto max-w-3xl space-y-6 px-4 py-14 sm:py-20" role="status" aria-live="polite">
        <p className="decreta-label text-primary">Reading the docket</p>
        <div aria-hidden className="space-y-4">
          <div className="h-10 w-3/4 bg-muted" />
          <div className="h-4 w-full bg-muted" />
          <div className="h-4 w-5/6 bg-muted" />
          <div className="mt-10 h-48 w-full border border-border bg-muted" />
          <div className="h-4 w-2/3 bg-muted" />
          <div className="h-4 w-1/2 bg-muted" />
        </div>
      </div>
    </div>
  );
}
