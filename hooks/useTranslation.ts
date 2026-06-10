import { getDictionary } from '../lib/i18n';

export function useTranslation() {
  const dict = getDictionary('es');

  const t = (path: string) => {
    // 1. Try direct resolution from root (e.g. feature.xlsx.premium.tooltip, common.all)
    const directVal = path.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), dict);
    if (directVal !== undefined) {
      return directVal;
    }

    // 2. Try namespace resolution under 'admin' (e.g. select_machine -> admin.select_machine)
    const adminPath = 'admin.' + path;
    const adminVal = adminPath.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), dict);
    if (adminVal !== undefined) {
      return adminVal;
    }

    // 3. Fallback to path name
    return path;
  };

  return { t };
}
