const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

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

// Lyrics retrieval function
async function getLyricsFromUrl(url) {
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);
    const lyricsHtml = $('div[data-lyrics-container|=true]');
    let lyrics = '';
    lyricsHtml.each((_, elem) => {
        lyrics += $(elem).text() + '\n';
    });
    return lyrics.trim();
}

// Endpoint to search for lyrics
app.get('/search-lyrics', async (req, res) => {
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
