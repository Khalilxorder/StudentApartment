// i18n and SEO Optimization Service
// Multi-language support, SEO optimization, and content management

export interface TranslationKey {
  key: string;
  defaultValue: string;
  context?: string;
  category: 'ui' | 'content' | 'email' | 'seo';
}

export interface LocalizedContent {
  language: string;
  title: string;
  description: string;
  keywords: string[];
  canonical?: string;
  alternateLanguages?: { language: string; url: string }[];
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  structuredData?: Record<string, any>;
}

export type SupportedLanguage = 'hu' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'ro' | 'sk' | 'pl' | 'cs';

export class I18nAndSEOService {
  private supportedLanguages: SupportedLanguage[] = ['hu', 'en', 'de', 'fr', 'es', 'it', 'ro', 'sk', 'pl', 'cs'];
  private defaultLanguage: SupportedLanguage = 'hu';
  private translations: Map<string, Map<SupportedLanguage, string>> = new Map();
  private contentCache: Map<string, LocalizedContent> = new Map();

  constructor() {
    this.initializeDefaultTranslations();
  }

  private initializeDefaultTranslations(): void {
    // Core UI translations
    const uiTranslations: TranslationKey[] = [
      {
        key: 'nav.search',
        defaultValue: 'Search',
        category: 'ui',
      },
      {
        key: 'nav.bookmarks',
        defaultValue: 'Saved Apartments',
        category: 'ui',
      },
      {
        key: 'nav.messages',
        defaultValue: 'Messages',
        category: 'ui',
      },
      {
        key: 'search.filters.price',
        defaultValue: 'Price Range',
        category: 'ui',
      },
      {
        key: 'search.filters.bedrooms',
        defaultValue: 'Bedrooms',
        category: 'ui',
      },
      {
        key: 'search.results.found',
        defaultValue: 'Found {count} apartments',
        category: 'ui',
      },
    ];

    // Email translations
    const emailTranslations: TranslationKey[] = [
      {
        key: 'email.welcome.subject',
        defaultValue: 'Welcome to Student Apartments!',
        category: 'email',
      },
      {
        key: 'email.welcome.body',
        defaultValue: 'Thank you for joining. Start searching for your perfect apartment.',
        category: 'email',
      },
      {
        key: 'email.verification.subject',
        defaultValue: 'Verify your email address',
        category: 'email',
      },
    ];

    // SEO translations
    const seoTranslations: TranslationKey[] = [
      {
        key: 'seo.home.title',
        defaultValue: 'Find Student Housing in Budapest | Student Apartments',
        category: 'seo',
      },
      {
        key: 'seo.home.description',
        defaultValue: 'Discover affordable student apartments in Budapest. Search by price, location, and amenities.',
        category: 'seo',
      },
      {
        key: 'seo.search.title',
        defaultValue: 'Search Student Apartments | Student Apartments',
        category: 'seo',
      },
    ];

    // Store translations (would normally load from translation files)
    [...uiTranslations, ...emailTranslations, ...seoTranslations].forEach(trans => {
      if (!this.translations.has(trans.key)) {
        this.translations.set(trans.key, new Map());
      }
      // Store default English and Hungarian
      this.translations.get(trans.key)!.set('en', trans.defaultValue);
      // Placeholder: in production, load from translation.hu.json, etc.
      this.translations.get(trans.key)!.set('hu', trans.defaultValue);
    });
  }

  translate(
    key: string,
    language: SupportedLanguage = this.defaultLanguage,
    variables?: Record<string, string | number>
  ): string {
    let value = this.translations.get(key)?.get(language) || 
                this.translations.get(key)?.get(this.defaultLanguage) || 
                key;

    // Interpolate variables
    if (variables) {
      Object.entries(variables).forEach(([varKey, varValue]) => {
        value = value.replace(`{${varKey}}`, String(varValue));
      });
    }

    return value;
  }

  generateSEOMetadata(
    pageType: 'home' | 'search' | 'apartment' | 'profile',
    language: SupportedLanguage = this.defaultLanguage,
    context?: Record<string, any>
  ): SEOMetadata {
    let metadata: SEOMetadata;

    switch (pageType) {
      case 'home':
        metadata = {
          title: this.translate('seo.home.title', language),
          description: this.translate('seo.home.description', language),
          keywords: ['student housing', 'apartments', 'Budapest', 'rental', 'accommodation'],
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Student Apartments',
            url: 'https://studentapartments.com',
          },
        };
        break;

      case 'search':
        metadata = {
          title: this.translate('seo.search.title', language),
          description: 'Search and filter student apartments by price, location, and amenities.',
          keywords: ['search apartments', 'student housing', 'Budapest', 'rental search'],
        };
        break;

      case 'apartment':
        metadata = {
          title: `${context?.title || 'Apartment'} | Student Apartments`,
          description: context?.description || 'View apartment details and contact the owner.',
          keywords: [
            'apartment',
            context?.district || 'Budapest',
            context?.bedrooms ? `${context.bedrooms} bedroom` : '',
            'student housing',
          ].filter(Boolean),
          ogImage: context?.photoUrl,
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'Apartment',
            name: context?.title,
            description: context?.description,
            address: context?.address,
            price: context?.price,
            priceCurrency: 'HUF',
            image: context?.photoUrl,
          },
        };
        break;

      case 'profile':
        metadata = {
          title: `${context?.ownerName || 'Profile'} | Student Apartments`,
          description: `View ${context?.ownerName}'s apartment listings.`,
          keywords: ['property owner', 'listings', 'apartments'],
        };
        break;

      default:
        metadata = {
          title: 'Student Apartments',
          description: 'Find your perfect student apartment.',
          keywords: ['apartments', 'student housing'],
        };
    }

    return metadata;
  }

  generateHrefLang(
    baseUrl: string,
    availableLanguages: SupportedLanguage[] = this.supportedLanguages
  ): { language: SupportedLanguage; url: string }[] {
    return availableLanguages.map(lang => ({
      language: lang,
      url: `${baseUrl}/${lang}`,
    }));
  }

  async localizeApartmentListing(
    apartment: any,
    language: SupportedLanguage = this.defaultLanguage
  ): Promise<LocalizedContent> {
    const cacheKey = `apt-${apartment.id}-${language}`;

    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey)!;
    }

    // Generate localized title and description
    const title = this.generateLocalizedTitle(apartment, language);
    const description = this.generateLocalizedDescription(apartment, language);
    const keywords = this.generateLocalizedKeywords(apartment, language);

    const content: LocalizedContent = {
      language,
      title,
      description,
      keywords,
      canonical: `https://studentapartments.com/apartments/${apartment.id}`,
      alternateLanguages: this.generateHrefLang(
        `https://studentapartments.com/apartments/${apartment.id}`,
        this.supportedLanguages
      ),
    };

    this.contentCache.set(cacheKey, content);

    return content;
  }

  private generateLocalizedTitle(apartment: any, language: SupportedLanguage): string {
    const titles: Record<SupportedLanguage, string> = {
      hu: `${apartment.bedrooms} szobás lakás ${apartment.district}-ben | Közlekedés: ${apartment.commuteMinutes} perc`,
      en: `${apartment.bedrooms} bedroom apartment in ${apartment.district} | ${apartment.commuteMinutes} min commute`,
      de: `${apartment.bedrooms}-Zimmer-Wohnung in ${apartment.district} | ${apartment.commuteMinutes} Min Pendelweg`,
      fr: `Appartement ${apartment.bedrooms} chambres à ${apartment.district} | ${apartment.commuteMinutes} min de trajet`,
      es: `Apartamento de ${apartment.bedrooms} dormitorios en ${apartment.district} | ${apartment.commuteMinutes} min de desplazamiento`,
      it: `Appartamento con ${apartment.bedrooms} camere a ${apartment.district} | ${apartment.commuteMinutes} min di pendolarismo`,
      ro: `Apartament cu ${apartment.bedrooms} camere în ${apartment.district} | ${apartment.commuteMinutes} min naveta`,
      sk: `${apartment.bedrooms}-izbový byt v ${apartment.district} | ${apartment.commuteMinutes} min dojazd`,
      pl: `${apartment.bedrooms}-pokojowy apartament w ${apartment.district} | ${apartment.commuteMinutes} min dojazd`,
      cs: `${apartment.bedrooms}-pokojový byt v ${apartment.district} | ${apartment.commuteMinutes} min dojíždění`,
    };

    return titles[language];
  }

  private generateLocalizedDescription(apartment: any, language: SupportedLanguage): string {
    const descriptions: Record<SupportedLanguage, string> = {
      hu: `${apartment.price} HUF/hó. ${apartment.amenities?.join(', ') || 'Felszerelt'}. Ideális hallgatók számára.`,
      en: `${apartment.price} HUF/month. ${apartment.amenities?.join(', ') || 'Furnished'}. Perfect for students.`,
      de: `${apartment.price} HUF/Monat. ${apartment.amenities?.join(', ') || 'Möbliert'}. Ideal für Studenten.`,
      fr: `${apartment.price} HUF/mois. ${apartment.amenities?.join(', ') || 'Meublé'}. Parfait pour les étudiants.`,
      es: `${apartment.price} HUF/mes. ${apartment.amenities?.join(', ') || 'Amueblado'}. Perfecto para estudiantes.`,
      it: `${apartment.price} HUF/mese. ${apartment.amenities?.join(', ') || 'Arredato'}. Perfetto per studenti.`,
      ro: `${apartment.price} HUF/lună. ${apartment.amenities?.join(', ') || 'Mobilat'}. Perfect pentru studenți.`,
      sk: `${apartment.price} HUF/mesiac. ${apartment.amenities?.join(', ') || 'Zariadené'}. Ideálne pre študentov.`,
      pl: `${apartment.price} HUF/miesiąc. ${apartment.amenities?.join(', ') || 'Umeblowane'}. Idealne dla studentów.`,
      cs: `${apartment.price} HUF/měsíc. ${apartment.amenities?.join(', ') || 'Zařízené'}. Ideální pro studenty.`,
    };

    return descriptions[language];
  }

  private generateLocalizedKeywords(apartment: any, language: SupportedLanguage): string[] {
    const baseKeywords = [
      apartment.district,
      `${apartment.bedrooms} bedroom`,
      'student housing',
      'apartment rental',
      'Budapest',
    ];

    const languageSpecificKeywords: Record<SupportedLanguage, string[]> = {
      hu: ['hallgatói lakcím', 'albérlet', 'diáknak'],
      en: baseKeywords,
      de: ['Studentenwohnung', 'Mietwohnung', 'Wohnung'],
      fr: ['logement étudiant', 'location appartement'],
      es: ['vivienda estudiantil', 'renta de apartamento'],
      it: ['alloggio studentesco', 'affitto appartamento'],
      ro: ['locuință pentru studenți', 'apartament de închiriat'],
      sk: ['ubytovanie študentov', 'prenajmie si byt'],
      pl: ['mieszkanie dla studentów', 'wynajem apartamentu'],
      cs: ['studentské bydlení', 'pronájem bytu'],
    };

    return [
      ...baseKeywords,
      ...languageSpecificKeywords[language],
    ];
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return this.supportedLanguages;
  }

  getLanguageName(language: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      hu: 'Magyar',
      en: 'English',
      de: 'Deutsch',
      fr: 'Français',
      es: 'Español',
      it: 'Italiano',
      ro: 'Română',
      sk: 'Slovenčina',
      pl: 'Polski',
      cs: 'Čeština',
    };

    return names[language] || language;
  }
}

export const i18nAndSEOService = new I18nAndSEOService();
