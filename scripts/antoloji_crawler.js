const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BATCHES_DIR = path.join(DATA_DIR, 'batches');
const JSONL_GZ_FILE = path.join(DATA_DIR, 'poems_data.jsonl.gz');
const JSONL_FILE = path.join(DATA_DIR, 'poems_data.jsonl');
const JSON_FILE = path.join(ROOT_DIR, 'poems_data.json');
const STATE_FILE = path.join(DATA_DIR, 'crawler_state.json');

const BATCH_SIZE = 5000;
const CONCURRENCY = 6;
const FLUSH_INTERVAL = 50;

const DEFAULT_COVERS = [
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80"
];

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function normalize(text) {
  if (!text) return '';
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  let s = text.toLowerCase().trim();
  for (const k in trMap) {
    s = s.replaceAll(k, trMap[k]);
  }
  return s.replace(/[^a-z0-9]/g, '');
}

function slugify(text) {
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  let s = text.toLowerCase().trim();
  for (const k in trMap) {
    s = s.replaceAll(k, trMap[k]);
  }
  return s.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#231;/g, 'ç').replace(/&#246;/g, 'ö').replace(/&#252;/g, 'ü')
    .replace(/&#287;/g, 'ğ').replace(/&#305;/g, 'ı').replace(/&#351;/g, 'ş')
    .replace(/&#199;/g, 'Ç').replace(/&#214;/g, 'Ö').replace(/&#220;/g, 'Ü')
    .replace(/&#286;/g, 'Ğ').replace(/&#304;/g, 'İ').replace(/&#350;/g, 'Ş')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

function writeBatchSql(batchNumber, items) {
  if (!fs.existsSync(BATCHES_DIR)) {
    fs.mkdirSync(BATCHES_DIR, { recursive: true });
  }
  const filePath = path.join(BATCHES_DIR, `poems_batch_${batchNumber}.sql`);
  let sql = `-- TÜRK ŞİİR ARŞİVİ BATCH ${batchNumber} (${items.length} ŞİİR)\n-- Oluşturulma: ${new Date().toISOString()}\n\n`;

  for (const poem of items) {
    const genresStr = "ARRAY[" + (poem.genres || []).map(g => escapeSql(g)).join(',') + "]::text[]";
    const metaStr = escapeSql(JSON.stringify(poem.metadata || {}));
    
    sql += `INSERT INTO contents (type, title, slug, cover_image, backdrop_image, content_text, summary, genres, global_rating, metadata) VALUES ('poem', ${escapeSql(poem.title)}, ${escapeSql(poem.slug)}, ${escapeSql(poem.cover_image)}, ${escapeSql(poem.backdrop_image)}, ${escapeSql(poem.content_text)}, ${escapeSql(poem.summary)}, ${genresStr}, ${poem.global_rating || 8.5}, ${metaStr}::jsonb) ON CONFLICT (slug) DO NOTHING;\n`;
  }

  fs.writeFileSync(filePath, sql, 'utf-8');
  console.log(`\n[💾 BATCH KAYDEDİLDİ] ${filePath} (${items.length} adet şiir)`);
}

async function fetchWithRetry(url, retries = 3, delay = 800) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      if (res.status === 200) {
        return await res.text();
      }
      if (res.status === 404) {
        return null;
      }
      if (res.status === 429 || res.status >= 500) {
        await new Promise(r => setTimeout(r, delay * attempt));
        continue;
      }
      return null;
    } catch (e) {
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
  return null;
}

function parsePoemHtml(html, pageUrl) {
  if (!html) return null;

  const titleTag = html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
  const decodedTitleTag = decodeHtmlEntities(titleTag);

  let poemTitle = '';
  let poetName = '';

  const parts = decodedTitleTag.split(/\s*Şiiri\s*-\s*/i);
  if (parts.length >= 2) {
    poemTitle = parts[0].trim();
    poetName = parts[1].trim();
  } else {
    const dashParts = decodedTitleTag.split(/\s*-\s*/);
    poemTitle = dashParts[0].trim();
    poetName = dashParts[1]?.trim() || 'Bilinmeyen Şair';
  }

  if (!poemTitle || poemTitle.length < 2) return null;

  const poemDiv = html.match(/<div class="pd-text">([\s\S]*?)<\/div>/i)?.[1];
  if (!poemDiv) return null;

  let text = poemDiv
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  text = decodeHtmlEntities(text);

  text = text.replace(new RegExp(`\\s*${poetName}\\s*Kayıt Tarihi[\\s\\S]*$`, 'i'), '').trim();
  text = text.replace(/\s*Kayıt Tarihi\s*:\s*[\d\.\s:]+$/i, '').trim();

  if (!text || text.length < 15) return null;

  const totalLines = text.split('\n').filter(l => l.trim().length > 0).length;
  const preview = text.replace(/\n+/g, ' ').slice(0, 140) + '...';

  return {
    title: poemTitle,
    poet: poetName,
    text: text,
    preview: preview,
    totalLines: totalLines
  };
}

async function loadExistingRecords(knownSignatures, knownSlugs) {
  let count = 0;
  const tailBuffer = [];

  let sourceStream = null;
  if (fs.existsSync(JSONL_FILE)) {
    sourceStream = fs.createReadStream(JSONL_FILE);
  } else if (fs.existsSync(JSONL_GZ_FILE)) {
    sourceStream = fs.createReadStream(JSONL_GZ_FILE).pipe(zlib.createGunzip());
  }

  if (sourceStream) {
    const rl = readline.createInterface({ input: sourceStream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const p = JSON.parse(line);
        count++;
        const sig = normalize(p.title) + '::' + normalize(p.metadata?.poet || '');
        knownSignatures.add(sig);
        if (p.slug) knownSlugs.add(p.slug);

        tailBuffer.push(p);
        if (tailBuffer.length > BATCH_SIZE) {
          tailBuffer.shift();
        }
      } catch (e) {}
    }

    const remainder = count % BATCH_SIZE;
    const currentBatch = remainder > 0 ? tailBuffer.slice(tailBuffer.length - remainder) : [];
    return { count, currentBatch };
  }

  if (fs.existsSync(JSON_FILE)) {
    try {
      const raw = fs.readFileSync(JSON_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      count = parsed.length;
      for (const p of parsed) {
        const sig = normalize(p.title) + '::' + normalize(p.metadata?.poet || '');
        knownSignatures.add(sig);
        if (p.slug) knownSlugs.add(p.slug);
      }
      const remainder = count % BATCH_SIZE;
      const currentBatch = remainder > 0 ? parsed.slice(count - remainder) : [];
      return { count, currentBatch };
    } catch (e) {
      console.error('[!] JSON okuma hatası:', e.message);
    }
  }

  return { count: 0, currentBatch: [] };
}

async function main() {
  console.log('='.repeat(65));
  console.log('   TÜRK ŞİİR ARŞİVİ - ANTOLOJI.COM STABİL TARAMA MOTORU');
  console.log('='.repeat(65));

  // 1. Build Memory-Efficient Duplicate Detection
  const knownSignatures = new Set();
  const knownSlugs = new Set();

  console.log('[*] Mevcut kayıtlar taranıyor...');
  const { count: totalPoemsInitial, currentBatch: initialBatch } = await loadExistingRecords(knownSignatures, knownSlugs);
  let totalPoemsCount = totalPoemsInitial;
  let currentBatch = initialBatch;

  console.log(`[+] Başarıyla indekslendi: ${totalPoemsCount} mevcut şiir, ${knownSignatures.size} imza.`);

  // 2. Load or initialize crawler state
  let state = {
    sitemapIndex: 0,
    urlIndex: 0,
    totalAdded: 0,
    totalDuplicatesSkipped: 0
  };

  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      console.log(`[🔄 KALDIĞI YERDEN DEVAM] Sitemap #${state.sitemapIndex + 1}, URL #${state.urlIndex}`);
    } catch (e) {
      console.log('[!] State dosyası sıfırlandı.');
    }
  }

  // 3. Fetch sitemap index
  console.log('[*] Antoloji.com sitemap listesi alınıyor...');
  const mainSitemapXml = await fetchWithRetry('https://www.antoloji.com/sitemap.xml');
  if (!mainSitemapXml) {
    throw new Error('Ana sitemap çekilemedi!');
  }

  const sitemapUrls = [...mainSitemapXml.matchAll(/<loc>(https:\/\/www\.antoloji\.com\/sitemap-siirler-[^<]+)<\/loc>/g)].map(m => m[1]);
  console.log(`[+] Toplam ${sitemapUrls.length} adet sitemap paketi bulundu.`);

  let batchCounter = Math.floor(totalPoemsCount / BATCH_SIZE);
  let pendingBuffer = [];

  // Stream write stream for JSONL
  const jsonlStream = fs.createWriteStream(JSONL_FILE, { flags: 'a', encoding: 'utf-8' });

  function flushToDisk() {
    if (pendingBuffer.length === 0) return;

    for (const item of pendingBuffer) {
      jsonlStream.write(JSON.stringify(item) + '\n');
    }

    pendingBuffer = [];
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  for (let sIdx = state.sitemapIndex; sIdx < sitemapUrls.length; sIdx++) {
    const sitemapUrl = sitemapUrls[sIdx];
    console.log(`\n📂 [SITEMAP ${sIdx + 1}/${sitemapUrls.length}] İndiriliyor: ${sitemapUrl}`);

    const sitemapXml = await fetchWithRetry(sitemapUrl);
    if (!sitemapXml) {
      console.log(`[!] Sitemap indirilemedi, atlanıyor: ${sitemapUrl}`);
      continue;
    }

    const poemUrls = [...sitemapXml.matchAll(/<loc>(https:\/\/www\.antoloji\.com\/[a-z0-9\-]+-siiri\/)<\/loc>/g)].map(m => m[1]);
    console.log(`[i] Bu pakette ${poemUrls.length} adet şiir adresi var.`);

    const startUrlIdx = (sIdx === state.sitemapIndex) ? state.urlIndex : 0;

    for (let uIdx = startUrlIdx; uIdx < poemUrls.length; uIdx += CONCURRENCY) {
      const chunk = poemUrls.slice(uIdx, uIdx + CONCURRENCY);

      const promises = chunk.map(async (url) => {
        const html = await fetchWithRetry(url);
        if (!html) return null;
        const parsed = parsePoemHtml(html, url);
        return { parsed, url };
      });

      const results = await Promise.all(promises);

      for (const res of results) {
        if (!res || !res.parsed) continue;

        const { parsed, url } = res;
        const sig = normalize(parsed.title) + '::' + normalize(parsed.poet);

        if (knownSignatures.has(sig)) {
          state.totalDuplicatesSkipped++;
          continue;
        }

        knownSignatures.add(sig);

        let baseSlug = slugify(`${parsed.title}-${parsed.poet}`);
        let finalSlug = baseSlug + '-' + Math.random().toString(36).substring(2, 7);
        while (knownSlugs.has(finalSlug)) {
          finalSlug = baseSlug + '-' + Math.random().toString(36).substring(2, 7);
        }
        knownSlugs.add(finalSlug);

        const cover = DEFAULT_COVERS[totalPoemsCount % DEFAULT_COVERS.length];

        const record = {
          type: 'poem',
          title: parsed.title,
          slug: finalSlug,
          cover_image: cover,
          backdrop_image: cover,
          content_text: parsed.text,
          summary: parsed.preview,
          genres: ['Türk Edebiyatı', 'Şiir', parsed.poet],
          global_rating: 8.5,
          metadata: {
            poet: parsed.poet,
            poet_slug: slugify(parsed.poet),
            theme: 'Türk Şiiri',
            is_hero: false,
            total_lines: parsed.totalLines,
            source_url: url
          }
        };

        currentBatch.push(record);
        pendingBuffer.push(record);
        totalPoemsCount++;
        state.totalAdded++;

        // Batch of 5,000 reached?
        if (currentBatch.length >= BATCH_SIZE) {
          batchCounter++;
          writeBatchSql(batchCounter, currentBatch);
          currentBatch = []; // Free memory immediately!
        }
      }

      state.sitemapIndex = sIdx;
      state.urlIndex = uIdx + CONCURRENCY;

      if (pendingBuffer.length >= FLUSH_INTERVAL) {
        flushToDisk();
        process.stdout.write(`\r[✨ GELİŞME] Toplam Şiir: ${totalPoemsCount} (+${state.totalAdded} yeni) | Atlanan Mükerrer: ${state.totalDuplicatesSkipped} | Paket: ${sIdx + 1}/${sitemapUrls.length}`);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    state.urlIndex = 0;
    flushToDisk();
  }

  flushToDisk();
  jsonlStream.end();

  if (currentBatch.length > 0) {
    batchCounter++;
    writeBatchSql(batchCounter, currentBatch);
  }

  console.log('\n' + '='.repeat(65));
  console.log(`🎉 ARŞİVLEME TAMAMLANDI! Toplam Şiir: ${totalPoemsCount}`);
  console.log('='.repeat(65));
}

main().catch(err => {
  console.error('\n[❌ HATA]:', err);
});
