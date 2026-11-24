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
const MASTERS_SQL_FILE = path.join(BATCHES_DIR, 'poems_batch_masters_complete.sql');

const MASTER_POETS = [
  // İkinci Yeni & Çağdaş Klasikler
  { name: 'Cemal Süreya', slug: 'cemal-sureya' },
  { name: 'Turgut Uyar', slug: 'turgut-uyar' },
  { name: 'Edip Cansever', slug: 'edip-cansever' },
  { name: 'Ece Ayhan', slug: 'ece-ayhan' },
  { name: 'İlhan Berk', slug: 'ilhan-berk' },
  { name: 'Sezai Karakoç', slug: 'sezai-karakoc' },
  { name: 'Ülkü Tamer', slug: 'ulku-tamer' },

  // Garip Akımı
  { name: 'Orhan Veli Kanık', slug: 'orhan-veli-kanik' },
  { name: 'Melih Cevdet Anday', slug: 'melih-cevdet-anday' },
  { name: 'Oktay Rifat', slug: 'oktay-rifat' },

  // Toplumcu Gerçekçiler & 40-70 Kuşağı
  { name: 'Nazım Hikmet Ran', slug: 'nazim-hikmet-ran' },
  { name: 'Ahmed Arif', slug: 'ahmed-arif' },
  { name: 'Attila İlhan', slug: 'attila-ilhan' },
  { name: 'Can Yücel', slug: 'can-yucel' },
  { name: 'Hasan Hüseyin Korkmazgil', slug: 'hasan-huseyin-korkmazgil' },
  { name: 'Enver Gökçe', slug: 'enver-gokce' },
  { name: 'Rıfat Ilgaz', slug: 'rifat-ilgaz' },
  { name: 'Şükrü Erbaş', slug: 'sukru-erbas' },
  { name: 'Ataol Behramoğlu', slug: 'ataol-behramoglu' },
  { name: 'Ahmet Telli', slug: 'ahmet-telli' },
  { name: 'Nihat Behram', slug: 'nihat-behram' },
  { name: 'Refik Durbaş', slug: 'refik-durbas' },
  { name: 'Gülten Akın', slug: 'gulten-akin' },
  { name: 'Metin Altıok', slug: 'metin-altiok' },
  { name: 'Sunay Akın', slug: 'sunay-akin' },
  { name: 'Haydar Ergülen', slug: 'haydar-ergulen' },
  { name: 'Küçük İskender', slug: 'kucuk-iskender' },
  { name: 'Hilmi Yavuz', slug: 'hilmi-yavuz' },

  // Cumhuriyet & Saf Şiir / Mistik
  { name: 'Necip Fazıl Kısakürek', slug: 'necip-fazil-kisakurek' },
  { name: 'Cahit Sıtkı Tarancı', slug: 'cahit-sitki-taranci' },
  { name: 'Ahmet Hamdi Tanpınar', slug: 'ahmet-hamdi-tanpinar' },
  { name: 'Yahya Kemal Beyatlı', slug: 'yahya-kemal-beyatli' },
  { name: 'Ahmet Muhip Dıranas', slug: 'ahmet-muhip-diranas' },
  { name: 'Özdemir Asaf', slug: 'ozdemir-asaf' },
  { name: 'Behçet Necatigil', slug: 'behcet-necatigil' },
  { name: 'Fazıl Hüsnü Dağlarca', slug: 'fazil-husnu-daglarca' },
  { name: 'Ziya Osman Saba', slug: 'ziya-osman-saba' },
  { name: 'Asaf Halet Çelebi', slug: 'asaf-halet-celebi' },
  { name: 'Bedri Rahmi Eyüboğlu', slug: 'bedri-rahmi-eyuboglu' },
  { name: 'Cahit Zarifoğlu', slug: 'cahit-zarifoglu' },
  { name: 'Erdem Bayazıt', slug: 'erdem-bayazit' },
  { name: 'İsmet Özel', slug: 'ismet-ozel' },
  { name: 'Ümit Yaşar Oğuzcan', slug: 'umit-yasar-oguzcan' },
  { name: 'Abdurrahim Karakoç', slug: 'abdurrahim-karakoc' },
  { name: 'Bahaettin Karakoç', slug: 'bahaettin-karakoc' },
  { name: 'Sabahattin Ali', slug: 'sabahattin-ali' },

  // Milli Edebiyat & Beş Hececiler
  { name: 'Mehmet Akif Ersoy', slug: 'mehmet-akif-ersoy' },
  { name: 'Faruk Nafiz Çamlıbel', slug: 'faruk-nafiz-camlibel' },
  { name: 'Ziya Gökalp', slug: 'ziya-gokalp' },
  { name: 'Orhan Seyfi Orhon', slug: 'orhan-seyfi-orhon' },
  { name: 'Yusuf Ziya Ortaç', slug: 'yusuf-ziya-ortac' },
  { name: 'Enis Behiç Koryürek', slug: 'enis-behic-koryurek' },
  { name: 'Halit Fahri Ozansoy', slug: 'halit-fahri-ozansoy' },
  { name: 'Kemalettin Kamu', slug: 'kemalettin-kamu' },
  { name: 'Rıza Tevfik Bölükbaşı', slug: 'riza-tevfik-bolukbasi' },

  // Tanzimat & Servet-i Fünun
  { name: 'Tevfik Fikret', slug: 'tevfik-fikret' },
  { name: 'Cenap Şahabettin', slug: 'cenap-sahabettin' },
  { name: 'Ahmet Haşim', slug: 'ahmet-hasim' },
  { name: 'Namık Kemal', slug: 'namik-kemal' },
  { name: 'Abdülhak Hamit Tarhan', slug: 'abdulhak-hamit-tarhan' },
  { name: 'Recaizade Mahmut Ekrem', slug: 'recaizade-mahmud-ekrem' },

  // Halk & Tekke Edebiyatı / Ozanlar
  { name: 'Yunus Emre', slug: 'yunus-emre' },
  { name: 'Mevlana Celaleddin Rumi', slug: 'mevlana-celaleddin-rumi' },
  { name: 'Pir Sultan Abdal', slug: 'pir-sultan-abdal' },
  { name: 'Karacaoğlan', slug: 'karacaoglan' },
  { name: 'Dadaloğlu', slug: 'dadaloglu' },
  { name: 'Köroğlu', slug: 'koroglu' },
  { name: 'Aşık Veysel Şatıroğlu', slug: 'asik-veysel-satiroglu' },
  { name: 'Mahzuni Şerif', slug: 'mahzuni-serif' },
  { name: 'Neşet Ertaş', slug: 'neset-ertas' },
  { name: 'Erzurumlu Emrah', slug: 'erzurumlu-emrah' },
  { name: 'Seyrani', slug: 'seyrani' },

  // Divan Şiiri Ustaları
  { name: 'Fuzuli', slug: 'fuzuli' },
  { name: 'Baki', slug: 'baki' },
  { name: 'Nedim', slug: 'nedim' },
  { name: 'Nef\'i', slug: 'nef-i' },
  { name: 'Şeyh Galib', slug: 'seyh-galib' },
  { name: 'Yusuf Nabi', slug: 'yusuf-nabi' }
];

const DEFAULT_COVERS = [
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80"
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
  for (const k in trMap) s = s.replaceAll(k, trMap[k]);
  return s.replace(/[^a-z0-9]/g, '');
}

function slugify(text) {
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  let s = text.toLowerCase().trim();
  for (const k in trMap) s = s.replaceAll(k, trMap[k]);
  return s.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#231;/g, 'ç').replace(/&#246;/g, 'ö').replace(/&#252;/g, 'ü')
    .replace(/&#287;/g, 'ğ').replace(/&#305;/g, 'ı').replace(/&#351;/g, 'ş')
    .replace(/&#199;/g, 'Ç').replace(/&#214;/g, 'Ö').replace(/&#220;/g, 'Ü')
    .replace(/&#286;/g, 'Ğ').replace(/&#304;/g, 'İ').replace(/&#350;/g, 'Ş')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
        }
      });
      if (res.status === 200) return await res.text();
      if (res.status === 404) return null;
      await new Promise(r => setTimeout(r, 400 * attempt));
    } catch {
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
  return null;
}

function parsePoem(html, url, defaultPoetName) {
  if (!html) return null;
  const titleTag = decodeHtmlEntities(html.match(/<title>(.*?)<\/title>/i)?.[1] || '');
  let poemTitle = '';
  let poetName = defaultPoetName;

  const parts = titleTag.split(/\s*Şiiri\s*-\s*/i);
  if (parts.length >= 2) {
    poemTitle = parts[0].trim();
    poetName = parts[1].trim();
  } else {
    poemTitle = titleTag.split(/\s*-\s*/)[0].trim();
  }

  const poemDiv = html.match(/<div class="pd-text">([\s\S]*?)<\/div>/i)?.[1];
  if (!poemDiv) return null;

  let text = poemDiv.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p>/gi, '\n\n').replace(/<[^>]+>/g, '').trim();
  text = decodeHtmlEntities(text);
  text = text.replace(new RegExp(`\\s*${poetName}\\s*Kayıt Tarihi[\\s\\S]*$`, 'i'), '').trim();
  text = text.replace(/\s*Kayıt Tarihi\s*:\s*[\d\.\s:]+$/i, '').trim();

  if (!text || text.length < 15) return null;

  return {
    title: poemTitle,
    poet: poetName,
    text: text,
    lines: text.split('\n').filter(l => l.trim().length > 0).length,
    preview: text.replace(/\n+/g, ' ').slice(0, 140) + '...'
  };
}

async function main() {
  console.log('='.repeat(70));
  console.log('   türk edebiyatı usta şairleri külliyat motoru');
  console.log('='.repeat(70));

  console.log('[*] mevcut arşiv taranıyor...');
  const knownSignatures = new Set();
  const knownUrls = new Set();
  const knownSlugs = new Set();
  let totalLoaded = 0;

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
        totalLoaded++;
        knownSignatures.add(normalize(p.title) + '::' + normalize(p.metadata?.poet || ''));
        if (p.metadata?.source_url) {
          knownUrls.add(p.metadata.source_url.toLowerCase().trim());
          const match = p.metadata.source_url.match(/\/[a-z0-9\-]+-siiri\//i);
          if (match) knownUrls.add(match[0].toLowerCase());
        }
        if (p.slug) knownSlugs.add(p.slug);
      } catch (e) {}
    }
  } else if (fs.existsSync(JSON_FILE)) {
    const raw = fs.readFileSync(JSON_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    totalLoaded = parsed.length;
    for (const p of parsed) {
      knownSignatures.add(normalize(p.title) + '::' + normalize(p.metadata?.poet || ''));
      if (p.metadata?.source_url) {
        knownUrls.add(p.metadata.source_url.toLowerCase().trim());
        const match = p.metadata.source_url.match(/\/[a-z0-9\-]+-siiri\//i);
        if (match) knownUrls.add(match[0].toLowerCase());
      }
      if (p.slug) knownSlugs.add(p.slug);
    }
  }

  console.log(`[+] Arşivdeki Toplam Şiir Sayısı: ${totalLoaded}`);

  console.log(`[i] Hızlı Filtre: ${knownUrls.size} URL ve ${knownSignatures.size} imza bellekte hazır.`);

  const newPoemsList = [];
  const poetReport = [];

  console.log(`\n[*] ${MASTER_POETS.length} adet usta şair kontrol ediliyor...\n`);

  for (let i = 0; i < MASTER_POETS.length; i++) {
    const poet = MASTER_POETS[i];
    process.stdout.write(`[${(i + 1).toString().padStart(2, '0')}/${MASTER_POETS.length}] ${poet.name.padEnd(28)}: `);

    const baseUrl = `https://www.antoloji.com/${poet.slug}/`;
    const p1Html = await fetchWithRetry(baseUrl);
    if (!p1Html) {
      console.log('❌ Profil bulunamadı!');
      continue;
    }

    const poemUrlSet = new Set();
    const p1Matches = [...p1Html.matchAll(/href="(\/[a-z0-9\-]+-siiri\/)"/gi)].map(m => m[1]);
    p1Matches.forEach(u => poemUrlSet.add(u));

    const pageNums = [...p1Html.matchAll(/sayfa=(\d+)/gi)].map(m => parseInt(m[1], 10));
    const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;

    for (let p = 2; p <= maxPage; p++) {
      const pageUrl = `${baseUrl}?sayfa=${p}`;
      const pageHtml = await fetchWithRetry(pageUrl);
      if (pageHtml) {
        const matches = [...pageHtml.matchAll(/href="(\/[a-z0-9\-]+-siiri\/)"/gi)].map(m => m[1]);
        matches.forEach(u => poemUrlSet.add(u));
      }
      await new Promise(r => setTimeout(r, 60));
    }

    const poetUrlPaths = Array.from(poemUrlSet);
    let existingCount = 0;
    let addedCount = 0;

    for (const urlPath of poetUrlPaths) {
      const fullUrl = `https://www.antoloji.com${urlPath}`;

      if (knownUrls.has(urlPath.toLowerCase()) || knownUrls.has(fullUrl.toLowerCase())) {
        existingCount++;
        continue;
      }

      // If not in URL cache, fetch poem page
      const poemHtml = await fetchWithRetry(fullUrl);
      if (!poemHtml) continue;

      const poemData = parsePoem(poemHtml, fullUrl, poet.name);
      if (!poemData) continue;

      const sig = normalize(poemData.title) + '::' + normalize(poemData.poet);
      if (knownSignatures.has(sig)) {
        knownUrls.add(urlPath.toLowerCase());
        existingCount++;
        continue;
      }

      knownSignatures.add(sig);
      knownUrls.add(urlPath.toLowerCase());
      knownUrls.add(fullUrl.toLowerCase());

      let finalSlug = slugify(`${poemData.title}-${poet.name}`) + '-' + Math.random().toString(36).substring(2, 7);
      while (knownSlugs.has(finalSlug)) {
        finalSlug = slugify(`${poemData.title}-${poet.name}`) + '-' + Math.random().toString(36).substring(2, 7);
      }
      knownSlugs.add(finalSlug);

      const cover = DEFAULT_COVERS[(poems.length + newPoemsList.length) % DEFAULT_COVERS.length];

      const record = {
        type: 'poem',
        title: poemData.title,
        slug: finalSlug,
        cover_image: cover,
        backdrop_image: cover,
        content_text: poemData.text,
        summary: poemData.preview,
        genres: ['Türk Edebiyatı', 'Şiir', poet.name],
        global_rating: 9.0,
        metadata: {
          poet: poet.name,
          poet_slug: poet.slug,
          theme: 'Türk Klasikleri',
          is_hero: true,
          total_lines: poemData.lines,
          source_url: fullUrl
        }
      };

      poems.push(record);
      newPoemsList.push(record);
      addedCount++;
    }

    console.log(`✅ ${poetUrlPaths.length} şiir (${existingCount} zaten mevcuttu${addedCount > 0 ? `, +${addedCount} yeni tamamlandı` : ''})`);
    poetReport.push({ name: poet.name, total: poetUrlPaths.length, added: addedCount, existing: existingCount });
  }

  // Save new additions
  if (newPoemsList.length > 0) {
    console.log(`\n[*] Disk güncelleniyor: +${newPoemsList.length} yeni usta şiir diske kaydediliyor...`);
    const jsonlStream = fs.createWriteStream(JSONL_FILE, { flags: 'a', encoding: 'utf-8' });
    for (const p of newPoemsList) {
      jsonlStream.write(JSON.stringify(p) + '\n');
    }
    jsonlStream.end();

    let sql = `-- TÜRK EDEBİYATI USTA ŞAİRLER EKSİKSİZ TAMAMLAMA BATCHI\n-- Eklenen: ${newPoemsList.length} adet şiir\n-- Zaman: ${new Date().toISOString()}\n\n`;
    for (const p of newPoemsList) {
      const genresStr = "ARRAY[" + (p.genres || []).map(g => escapeSql(g)).join(',') + "]::text[]";
      const metaStr = escapeSql(JSON.stringify(p.metadata || {}));
      sql += `INSERT INTO contents (type, title, slug, cover_image, backdrop_image, content_text, summary, genres, global_rating, metadata) VALUES ('poem', ${escapeSql(p.title)}, ${escapeSql(p.slug)}, ${escapeSql(p.cover_image)}, ${escapeSql(p.backdrop_image)}, ${escapeSql(p.content_text)}, ${escapeSql(p.summary)}, ${genresStr}, ${p.global_rating || 9.0}, ${metaStr}::jsonb) ON CONFLICT (slug) DO NOTHING;\n`;
    }
    fs.writeFileSync(MASTERS_SQL_FILE, sql, 'utf-8');
    console.log(`[💾 sql dosyası kaydedildi] ${MASTERS_SQL_FILE}`);
  } else {
    console.log(`\n🎉 usta şairlerin tüm şiirleri arşivde eksiksiz yer alıyor.`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 doğrulama tamamlandı!`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('\n[❌ hata]:', err);
});
