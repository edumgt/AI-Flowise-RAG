const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { getChatModel, getEmbeddings } = require("./providers");
const { search } = require("./qdrant");

const SYSTEM = `당신은 은행 업무(리테일/기업금융/리스크/준법/운영) 문서를 기반으로 답변하는 도우미입니다.
- 문서에 근거한 내용만 답하세요.
- 모르면 "모르겠습니다"라고 말하세요.
- 가능하면 bullet로 간결히 정리하세요.
- 규정/법령 관련은 "내부 최신 문서 확인 필요"를 함께 안내하세요.`;

function formatContext(hits) {
  return hits
    .map((h, idx) => {
      const source = h.meta?.source || h.meta?.file || "unknown";
      const excerpt = (h.text || "").slice(0, 900);
      return `[#${idx + 1}] source=${source}\n${excerpt}`;
    })
    .join("\n\n");
}

async function answerQuestion(question, { topK = 5, collection }) {
  const embeddings = await getEmbeddings();
  const hits = await search({ query: question, embeddings, topK, collection });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM],
    ["human", `질문: {question}\n\n문서 발췌:\n{context}`],
  ]);

  const model = await getChatModel();
  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  const context = formatContext(hits);
  const answer = await chain.invoke({ question, context });

  const sources = hits.map((h) => ({ source: h.meta?.source, score: h.score, id: h.id }));
  return { answer, sources };
}

module.exports = { answerQuestion };
