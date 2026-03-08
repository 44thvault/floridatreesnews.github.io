export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    const RSS_URL =
        'https://news.google.com/rss/search?q=florida+marijuana+cannabis&hl=en-US&gl=US&ceid=US:en';

    try {
        const response = await fetch(RSS_URL, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (compatible; FloridaTreesNews/1.0)',
            },
        });

        if (!response.ok) {
            throw new Error(`Google News returned ${response.status}`);
        }

        const xml = await response.text();

        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            const block = match[1];
            const title = extractTag(block, 'title');
            const link = extractTag(block, 'link');
            const pubDate = extractTag(block, 'pubDate');
            const source = extractTag(block, 'source');

            if (title && link) {
                items.push({ title, link, pubDate, source });
            }
        }

        res.status(200).json({ ok: true, items: items.slice(0, 15) });
    } catch (err) {
        console.error('RSS fetch error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
}

function extractTag(text, tag) {
    const cdataRegex = new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`,
    );
    const cdataMatch = text.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    const plainRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const plainMatch = text.match(plainRegex);
    if (plainMatch) return plainMatch[1].trim();

    if (tag === 'link') {
        const linkRegex = /<link[^>]*>\s*(https?:\/\/[^\s<]+)/;
        const linkMatch = text.match(linkRegex);
        if (linkMatch) return linkMatch[1].trim();
    }

    return '';
}
