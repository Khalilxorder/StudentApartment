import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
    // Await the locale from the request
    const locale = await requestLocale ?? 'en';

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
