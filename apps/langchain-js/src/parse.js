const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.md' || ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(dataBuffer);
    return (parsed.text || '').trim() || '[PDF에서 추출된 텍스트가 없습니다. (스캔 PDF일 수 있음)]';
  }

  if (ext === '.docx') {
    const buf = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: buf });
    return (result.value || '').trim() || '[DOCX에서 추출된 텍스트가 없습니다.]';
  }

  return `지원되지 않는 파일 형식(${ext})입니다.`;
}

function chunkText(text, chunkSize=800, overlap=120) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.slice(i, end));
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks.filter(x => x.trim().length > 0);
}

module.exports = { parseFile, chunkText };
