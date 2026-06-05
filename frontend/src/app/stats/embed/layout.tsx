export default function StatsEmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "var(--mist)" }}
    >
      <div className="h-[420px] w-[600px] max-w-full overflow-auto p-3">
        {children}
      </div>
    </div>
  );
}
