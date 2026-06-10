"use client";

import { usePathname } from 'next/navigation';
import { useTranslation } from '../../hooks/useTranslation';

interface MVPBannerProps {
  lang: 'es'; // Assuming 'es' for now, can be expanded
}

export default function MVPBanner({ lang }: MVPBannerProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 p-2 text-center text-sm bg-gray-200 text-gray-700 py-3">
      {t('banner.mvp.message')}
    </div>
  );
}
