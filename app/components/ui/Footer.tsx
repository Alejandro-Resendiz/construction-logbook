interface FooterProps {
  publisher: string
  email: string
  linkedin: string
  variant?: 'page' | 'sidebar' | 'mobile-menu'
}

export default function Footer({ publisher, email, linkedin, variant = 'page' }: FooterProps) {
  if (variant === 'mobile-menu') {
    return (
      <div className="w-full py-4 text-center text-xs text-gray-400">
        <p>© 2026 {publisher}. Hecho con ♥ en México.</p>
      </div>
    )
  }

  if (variant === 'sidebar') {
    return (
      <div className="w-full py-4 px-4 border-t border-gray-100 text-center text-xs text-gray-400">
        <p className="font-medium text-gray-600">© 2026 {publisher}. Hecho en México.</p>
        {email && (
          <a href={`mailto:${email}`} className="hover:text-blue-600 transition-colors">
            <p className="text-[10px]">{email}</p>
          </a>
        )}
        {linkedin && (
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            <p className="text-[10px]">LinkedIn</p>
          </a>
        )}
      </div>
    )
  }

  return (
    <footer className="w-full py-4 px-6 bg-white border-t border-gray-100 text-center text-gray-500 text-sm">
      <p>© 2026 {publisher}. Hecho con ♥ en México.</p>
      <div className="flex justify-center gap-4 mt-2 text-xs">
        {email && (
          <a href={`mailto:${email}`} className="hover:text-blue-600 transition-colors">
            {email}
          </a>
        )}
      </div>
    </footer>
  )
}
