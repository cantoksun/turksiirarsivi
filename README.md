# Turk Siir Arsivi

Turk edebiyatinin farkli donemlerine ait siir verilerini, SQL batch dosyalarini ve veri toplama araclarini iceren acik kaynakli arsiv deposu.

---

## Dizin Yapisi

```text
turksiirarsivi/
├── data/
│   ├── poems_data.jsonl.gz           # Tum veri seti (Gzip JSONL formati)
│   ├── crawler_state.json            # Tarayici durum takip dosyasi
│   └── batches/                      # SQL INSERT paketleri (1 - 44)
├── scripts/
│   ├── antoloji_crawler.js           # Kalinan yerden devam edebilen tarama araci
│   ├── harvest_master_poets.js       # Sair tamamlama ve kontrol araci
│   ├── export_sqlite.py              # SQLite aktarim ve FTS5 indeksleme scripti
│   └── start_crawler.bat             # Calistirma betigi
├── .gitignore
├── LICENSE
└── README.md
```

---

## Veri Semasi

| Alan | Tip | Aciklama |
| :--- | :--- | :--- |
| `type` | `string` | Icerik tipi ('poem') |
| `title` | `string` | Siir basligi |
| `slug` | `string` | Benzersiz url anahtari |
| `content_text` | `text` | Siir metni |
| `summary` | `string` | Kisa onizleme metni |
| `genres` | `array` | Edebiyat ve sair etiketleri |
| `metadata.poet` | `string` | Sair adi |
| `metadata.poet_slug` | `string` | Sair url anahtari |
| `metadata.total_lines` | `integer` | Satir sayisi |
| `metadata.source_url` | `string` | Kaynak web adresi |

---

## Kullanim

### 1. SQLite Veritabanina Donusturme

Verileri FTS5 tam metin aramali SQLite veritabanina aktarmak icin:

```bash
python scripts/export_sqlite.py
```

### 2. Tarayiciyi Calistirma

Tarama aracini son kaydedilen durumdan devam ettirmek icin:

```bash
node scripts/antoloji_crawler.js
```

---

## Lisans

MIT Lisansi.
