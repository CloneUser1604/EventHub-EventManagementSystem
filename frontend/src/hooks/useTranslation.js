import useSettingStore from '../store/settingStore';
import { en } from '../i18n/en';
import { vi } from '../i18n/vi';

const dictionaries = {
  en,
  vi
};

export function useTranslation() {
  const { language } = useSettingStore();

  const t = (key) => {
    const keys = key.split('.');
    let value = dictionaries[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to Vietnamese if not found
        let fallback = dictionaries['vi'];
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return key; // return key itself if completely missing
          }
        }
        return fallback;
      }
    }
    return value;
  };

  return { t, language };
};
