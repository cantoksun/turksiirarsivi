#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Türk Şiir Arşivi - SQLite Veritabanı Dönüştürücü
220.600+ şiiri FTS5 (Full-Text Search) tam metin arama indeksli SQLite veritabanına aktarır.
"""

import gzip
import json
import os
import sqlite3
import sys
import time

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root_dir, "data")
    gz_file = os.path.join(data_dir, "poems_data.jsonl.gz")
    jsonl_file = os.path.join(data_dir, "poems_data.jsonl")
    db_file = os.path.join(root_dir, "turksiirarsivi.db")

    source_path = None
    is_gz = False
    if os.path.exists(jsonl_file):
        source_path = jsonl_file
    elif os.path.exists(gz_file):
        source_path = gz_file
        is_gz = True
    else:
        print("[!] Veri dosyası bulunamadı (data/poems_data.jsonl.gz veya data/poems_data.jsonl bekleniyor).")
        sys.exit(1)

    print("=" * 65)
    print("   TÜRK ŞİİR ARŞİVİ - SQLITE VE FTS5 AKTARIM ARACI")
    print("=" * 65)
    print(f"[*] Kaynak: {source_path}")
    print(f"[*] Hedef:  {db_file}")

    if os.path.exists(db_file):
        os.remove(db_file)

    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Performance pragmas
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA synchronous = NORMAL;")
    cursor.execute("PRAGMA cache_size = -64000;")  # 64MB cache

    # Main table
    cursor.execute("""
    CREATE TABLE poems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        poet TEXT,
        poet_slug TEXT,
        content_text TEXT NOT NULL,
        summary TEXT,
        genres TEXT,
        global_rating REAL DEFAULT 8.5,
        total_lines INTEGER DEFAULT 0,
        source_url TEXT,
        cover_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("CREATE INDEX idx_poems_poet ON poems(poet);")
    cursor.execute("CREATE INDEX idx_poems_poet_slug ON poems(poet_slug);")
    cursor.execute("CREATE INDEX idx_poems_title ON poems(title);")

    # FTS5 Virtual Table for Instant Search
    cursor.execute("""
    CREATE VIRTUAL TABLE poems_fts USING fts5(
        title,
        poet,
        content_text,
        content='poems',
        content_rowid='id',
        tokenize='unicode61'
    );
    """)

    open_fn = gzip.open if is_gz else open
    mode = "rt" if is_gz else "r"

    batch = []
    batch_size = 5000
    total = 0
    start_time = time.time()

    print("[*] Veriler okunuyor ve SQLite tablosuna yazılıyor...")

    with open_fn(source_path, mode, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                p = json.loads(line)
                meta = p.get("metadata") or {}
                poet = meta.get("poet") or ""
                poet_slug = meta.get("poet_slug") or ""
                total_lines = meta.get("total_lines") or 0
                source_url = meta.get("source_url") or ""
                genres = json.dumps(p.get("genres") or [], ensure_ascii=False)

                batch.append((
                    p.get("title", ""),
                    p.get("slug", ""),
                    poet,
                    poet_slug,
                    p.get("content_text", ""),
                    p.get("summary", ""),
                    genres,
                    p.get("global_rating", 8.5),
                    total_lines,
                    source_url,
                    p.get("cover_image", "")
                ))
                total += 1

                if len(batch) >= batch_size:
                    cursor.executemany("""
                    INSERT OR IGNORE INTO poems (title, slug, poet, poet_slug, content_text, summary, genres, global_rating, total_lines, source_url, cover_image)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """, batch)
                    conn.commit()
                    print(f"\r[+] İçe aktarılan: {total:,} şiir...", end="", flush=True)
                    batch = []

            except Exception:
                continue

    if batch:
        cursor.executemany("""
        INSERT OR IGNORE INTO poems (title, slug, poet, poet_slug, content_text, summary, genres, global_rating, total_lines, source_url, cover_image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, batch)
        conn.commit()

    print(f"\r[+] Toplam {total:,} şiir kaydedildi! FTS5 arama indeksi inşa ediliyor...")

    cursor.execute("""
    INSERT INTO poems_fts(rowid, title, poet, content_text)
    SELECT id, title, poet, content_text FROM poems;
    """)
    conn.commit()

    # Optimize and vacuum
    cursor.execute("INSERT INTO poems_fts(poems_fts) VALUES('optimize');")
    conn.commit()
    conn.close()

    elapsed = time.time() - start_time
    size_mb = os.path.getsize(db_file) / (1024 * 1024)
    print("\n" + "=" * 65)
    print(f"🎉 BAŞARILI! SQLite veritabanı hazır: {db_file}")
    print(f"   Toplam Şiir: {total:,} adet")
    print(f"   Dosya Boyutu: {size_mb:.1f} MB")
    print(f"   Geçen Süre: {elapsed:.1f} saniye")
    print("=" * 65)

if __name__ == "__main__":
    main()
