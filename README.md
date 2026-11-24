# türk şiir arşivi

türk edebiyatının farklı dönemlerine ait şiir verilerini, sql batch dosyalarını ve veri toplama araçlarını içeren açık kaynaklı arşiv deposu.

---

## dizin yapısı

```text
turksiirarsivi/
├── data/
│   ├── poems_data.jsonl.gz           # tüm veri seti (gzip jsonl formatı)
│   ├── crawler_state.json            # tarayıcı durum takip dosyası
│   └── batches/                      # sql insert paketleri (1 - 44)
├── scripts/
│   ├── antoloji_crawler.js           # kalınan yerden devam edebilen tarama aracı
│   ├── harvest_master_poets.js       # şair tamamlama ve kontrol aracı
│   ├── export_sqlite.py              # sqlite aktarım ve fts5 indeksleme scripti
│   └── start_crawler.bat             # çalıştırma betiği
├── .gitignore
├── LICENSE
└── README.md
```

---

## veri şeması

| alan | tip | açıklama |
| :--- | :--- | :--- |
| `type` | `string` | içerik tipi ('poem') |
| `title` | `string` | şiir başlığı |
| `slug` | `string` | benzersiz url anahtarı |
| `content_text` | `text` | şiir metni |
| `summary` | `string` | kısa önizleme metni |
| `genres` | `array` | edebiyat ve şair etiketleri |
| `metadata.poet` | `string` | şair adı |
| `metadata.poet_slug` | `string` | şair url anahtarı |
| `metadata.total_lines` | `integer` | satır sayısı |
| `metadata.source_url` | `string` | kaynak web adresi |

---

## kullanım

### 1. sqlite veritabanına dönüştürme

verileri fts5 tam metin aramalı sqlite veritabanına aktarmak için:

```bash
python scripts/export_sqlite.py
```

### 2. tarayıcıyı çalıştırma

tarama aracını son kaydedilen durumdan devam ettirmek için:

```bash
node scripts/antoloji_crawler.js
```

---

## lisans

mit lisansı.
