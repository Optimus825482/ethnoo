export default function HealthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">ShuttleCall Health</h1>
        <p className="text-sm text-zinc-500">
          API health check: <a href="/api/health" className="text-blue-600 underline">/api/health</a>
        </p>
      </div>
    </div>
  );
}
