import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    // the mailbox reader (lead email integration) uses Node sockets: keep these packages out of the bundle
    serverExternalPackages: ['imapflow', 'mailparser'],
    // API answers are personal: no browser, proxy or CDN may keep one and hand it to someone else
    async headers() {
        return [{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }, { key: 'Vary', value: 'Cookie, Authorization' }] }];
    },
};

export default withNextIntl(nextConfig);
