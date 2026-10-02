import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVA OTP — Telecommunications Marketplace",
  description: "Carrier lines, phone rentals, OTP verifications & SMS gateway",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('nava-theme');
                  var root = document.documentElement;
                  if (t === 'light') {
                    root.classList.add('light');
                    root.classList.remove('dark');
                    root.style.backgroundColor = '#f8fafc';
                    root.style.colorScheme = 'light';
                  } else {
                    root.classList.add('dark');
                    root.classList.remove('light');
                    root.style.backgroundColor = '#030712';
                    root.style.colorScheme = 'dark';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen transition-colors">
        {children}
      </body>
    </html>
  );
}