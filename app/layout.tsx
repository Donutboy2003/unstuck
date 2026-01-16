export const metadata = {
  title: "Snow Help",
  description: "Neighbors helping neighbors when cars get stuck.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0, padding: 0 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
          <h1 style={{ marginTop: 8 }}>Snow Help</h1>
          <p style={{ color: "#444", marginTop: -8 }}>
            Community help for stuck cars. Not emergency services.
          </p>
          <hr />
          {children}
        </div>
      </body>
    </html>
  );
}
