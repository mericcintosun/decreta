export default function CompareSkeleton() {
  return (
    <div className="decreta-ruled">
      <div className="decreta-rise mx-auto max-w-5xl space-y-6 px-4 py-14 sm:py-20" role="status" aria-live="polite">
        <p className="decreta-label text-primary">Reading both dockets</p>
        <div aria-hidden className="space-y-4">
          <div className="h-4 w-1/3 bg-muted" />
          <div className="h-10 w-4/5 bg-muted" />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-4 border-t-2 border-primary bg-muted p-5">
                <div className="h-4 w-1/2 bg-background" />
                <div className="h-8 w-4/5 bg-background" />
                <div className="h-4 w-full bg-background" />
                <div className="h-10 w-1/3 bg-background" />
                <div className="h-4 w-2/5 bg-background" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
