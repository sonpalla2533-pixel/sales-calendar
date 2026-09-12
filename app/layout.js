import "./globals.css";
import "./mobile-fit.css";

export const metadata = {
  title: "ปฏิทินฝ่ายขาย",
  description: "ระบบจัดการการจองด้วย Supabase"
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
