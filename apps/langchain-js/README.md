# LangChain JS Service

Endpoints:
- POST /ingest/file { collection, filePath, fileName?, docId?, version?, sha256? }
- POST /chat { question, collection, topK? }

Parsing:
- md/txt: plain
- pdf: pdf-parse
- docx: mammoth
