import en from '~/content/en/onboarding'

type OnboardingContent = typeof en

const locales: Record<string, OnboardingContent> = { en }

export function useContent() {
  // Hardcoded for now — swap to a reactive locale ref when i18n is added
  const locale = ref('en')

  const onboarding = computed<OnboardingContent>(() => locales[locale.value] ?? en)

  return { locale, onboarding }
}
