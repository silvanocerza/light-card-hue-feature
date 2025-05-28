import * as en from "./translations/en.json";
import * as it from "./translations/it.json";
import { HomeAssistant } from "custom-card-helpers";

const LANGUAGES: Record<string, unknown> = { en, it };

const DEFAULT_LANGUAGE = "en";

const getTranslatedString = (
  key: string,
  language: string,
): string | undefined => {
  try {
    return key
      .split(".")
      .reduce(
        (o, i) => (o as Record<string, unknown>)[i],
        LANGUAGES[language],
      ) as string;
  } catch {
    return undefined;
  }
};

const localize = (hass: HomeAssistant, key: string) => {
  const language = hass.locale.language ?? DEFAULT_LANGUAGE;
  let translated = getTranslatedString(key, language);
  if (!translated) {
    translated = getTranslatedString(key, DEFAULT_LANGUAGE);
  }
  return translated ?? key;
};
export default localize;
