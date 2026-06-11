'use client'

interface FooterProps {
  brandName: string
  email: string
  linkedin: string
  variant?: 'standard' | 'compact'
}

export default function Footer({ brandName, email, linkedin, variant = 'standard' }: FooterProps) {
  if (variant === 'compact') {
    return (
      <div className="md:hidden w-full py-1 px-4 bg-gray-50 border-t border-gray-200 text-center text-[10px] text-gray-400">
        <p>© 2026 {brandName}. Hecho con ♥ en México.</p>
      </div>
    )
  }

  return (
    <footer className="hidden md:flex w-full py-4 px-6 bg-white border-t border-gray-100 text-center text-gray-500 text-sm">
      <p>© 2026 {brandName}. Hecho con ♥ en México.</p>
      <div className="flex justify-center gap-4 mt-2 text-xs">
        {email && (
          <a href={`mailto:${email}`} className="hover:text-blue-600 transition-colors">
            {email}
          </a>
        )}
        {linkedin && (
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            LinkedIn
          </a>
        )}
      </div>
    </footer>
  )
}
