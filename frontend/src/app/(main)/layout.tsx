import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="font-body mx-auto w-full max-w-[900px] flex-1 px-6 py-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
