import "./globals.css"
import ClientProviders from "../providers/ClientProviders"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-[#0b1220] text-black dark:text-white transition-colors duration-300">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}