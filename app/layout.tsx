import './globals.css';

export const metadata = {
  title: 'ScanED',
  description: 'Empower educators with tools to improve student outcomes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}