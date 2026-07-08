import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TutorStar — Tutoring, organised",
  description:
    "The all-in-one platform for tutors to manage students, schedule lessons, and get paid.",
};

// Set the theme before first paint so there's no flash. Reads a saved choice,
// otherwise follows the OS preference. Kept tiny and inline on purpose.
const themeInit = `
(function () {
  try {
    var saved = localStorage.getItem("tutorstar-theme");
    var dark = saved ? saved === "axolotl-dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark ? "axolotl-dark" : "axolotl-light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "axolotl-light");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="axolotl-light"
      suppressHydrationWarning
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
