export const metadata = {
  title: "☕ Recipe Cost Calculator",
  description: "Coffee shop recipe cost calculator with Google Drive sync",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" async />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#f7f5f3", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
