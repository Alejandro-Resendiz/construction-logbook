import { getDictionary } from '../lib/i18n';

export function useTranslation(namespace?: string) {
  const dict = getDictionary('es');

  const t = (path: string) => {
    // 1. Try resolution with namespace (e.g. if namespace is 'admin', t('key') -> admin.key)
    if (namespace) {
      const namespacedPath = namespace + '.' + path;
      const namespacedVal = namespacedPath.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), dict);
      if (namespacedVal !== undefined) {
        return namespacedVal;
      }
    }

    // 2. Try direct resolution from root (e.g. feature.xlsx.premium.tooltip)
    const directVal = path.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), dict);
    if (directVal !== undefined) {
      return directVal;
    }

    // 3. Fallback to path name
    return path;
  };

  return { t };
}
