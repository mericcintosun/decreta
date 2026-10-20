export default function EscrowRecordLoading() {
  return (
    <div className="decreta-ruled">
      <div className="decreta-rise mx-auto max-w-3xl space-y-6 px-4 py-14 sm:py-20" role="status" aria-live="polite">
        <p className="decreta-label text-primary">Reading the docket</p>
        <div aria-hidden className="space-y-4">
          <div className="h-4 w-1/3 bg-muted" />
          <div className="h-10 w-4/5 bg-muted" />
          <div className="h-4 w-full bg-muted" />
          <div className="mt-10 h-32 w-full border-l-4 border-primary bg-muted" />
          <div className="h-4 w-1/2 bg-muted" />
          <div className="h-4 w-2/5 bg-muted" />
        </div>
      </div>
    </div>
  );
}
