const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.set('json spaces', 2);
const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.5',
    'Priority': 'u=0, i',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Sec-Gpc': '1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

// Lyrics search function
async function findLyrics(query) {
    const res = await axios.get(`https://genius.com/api/search?q=${encodeURIComponent(query)}`, { headers });
    const hits = res.data.response.hits;
    const result = hits.map(hit => ({
        full_title: hit.result.full_title,
        artist: hit.result.primary_artist.name,
        lyricsUrl: hit.result.url,
        coverImgUrl: hit.result.header_image_thumbnail_url
    }));
    return result;
}

// Function to replace text with bold letters
function replaceWithBoldLetters(text) {
    const boldLetterMap = {
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
        'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
        'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
        'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
        'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };

    return text.replace(/[A-Za-z0-9]/g, letter => {
        return boldLetterMap[letter] || letter;
    });
}

// Lyrics retrieval function
async function getLyricsFromUrl(url) {
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);
    const lyricsHtml = $('div[data-lyrics-container|=true]');

    let lyrics = '';
    lyricsHtml.each((_, elem) => {
        let text = $(elem).html().replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '');
        text = text.replace(/\[(.*?)\]/g, (match, p1) => {
            return `[${replaceWithBoldLetters(p1)}]`;
        });
        lyrics += text + '\n\n';
    });
    return lyrics.trim();
}

// Endpoint to search for lyrics
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        const results = await findLyrics(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get lyrics from URL
app.get('/get-lyrics', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }
        const lyrics = await getLyricsFromUrl(url);
        res.json({ lyrics });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to get song details and lyrics
app.get('/lyrics', async (req, res) => {
    try {
        const query = req.query.songname;
        if (!query) {
            return res.status(400).json({ error: 'Songname parameter is required' });
        }
        const results = await findLyrics(query);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }
        const firstResult = results[0];
        const lyrics = await getLyricsFromUrl(firstResult.lyricsUrl);
        res.json({
            title: firstResult.full_title,
            artist: firstResult.artist,
            coverUrl: firstResult.coverImgUrl,
            lyrics: lyrics,
            creator: 'Siam'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
