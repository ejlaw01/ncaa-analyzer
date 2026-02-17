import "./globals.css";

export const metadata = {
  title: "NCAA Basketball Picks",
  description: "Automated NCAA basketball over/under analysis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
