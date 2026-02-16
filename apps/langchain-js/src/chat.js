const { z } = require('zod');
const { client } = require('./qdrant');
const { getEmbeddings, getChatModel } = require('./llm');

const schema = z.object({
  question: z.string().min(1),
  collection: z.string().min(3),
  topK: z.number().int().min(1).max(20).optional(),
});

async function chatHandler(req, res) {
  try {
    const body = schema.parse(req.body);
    const topK = body.topK || 5;

    const embeddings = getEmbeddings();
    const qvec = await embeddings.embedQuery(body.question);

    const q = client();
    const hits = await q.search(body.collection, {
      vector: qvec,
      limit: topK,
      with_payload: true,
    });

    const contexts = (hits || []).map(h => h.payload?.text).filter(Boolean);
    const prompt = [
      "너는 은행업무 보조 AI다. 아래 '컨텍스트'만 근거로 답변하고, 근거가 부족하면 부족하다고 말해.",
      "또한 내부 준법/보안 관점에서 고객에게 노출하면 안 되는 정보는 생성하지 않는다.",
      "",
      "컨텍스트:",
      contexts.map((c,i) => `(${i+1}) ${c}`).join("\n\n"),
      "",
      "질문:",
      body.question,
    ].join("\n");

    const llm = getChatModel();
    const msg = await llm.invoke(prompt);
    return res.json({ answer: msg.content, sources: hits.map(h => ({ score: h.score, source: h.payload?.source, chunk: h.payload?.chunk })) });
  } catch (e) {
    return res.status(400).json({ error: 'chat failed', detail: String(e) });
  }
}

module.exports = { chatHandler };
