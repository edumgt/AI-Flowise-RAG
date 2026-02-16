const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { getChatModel, getEmbeddings } = require("./providers");
const { search } = require("./qdrant");

const SYSTEM = `당신은 사내 문서를 기반으로 답변하는 도우미입니다.
- 문서에 근거한 내용만 답하세요.
- 모르면 "모르겠습니다"라고 말하세요.
- 가능하면 bullet로 간결히 정리하세요.`;

function formatContext(hits) {
  return hits
    .map((h, idx) => {
      const source = h.meta?.source || h.meta?.file || "unknown";
      return `[#${idx + 1}] source=${source}\n${h.text}`;
    })
    .join("\n\n");
}

async function answerQuestion({ question, topK = 5 }) {
  const embeddings = getEmbeddings();
  const model = getChatModel();

  const hits = await search({ embeddings, query: question, topK });
  const context = formatContext(hits);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM],
    [
      "human",
      `다음은 참고 문서 발췌입니다.\n\n{context}\n\n질문: {question}\n\n요청: 한국어로 답변하고, 마지막에 'SOURCES:' 아래에 [#] 번호로 근거를 나열해 주세요.`,
    ],
  ]);

  const chain = prompt.pipe(model).pipe(new StringOutputParser());
  const text = await chain.invoke({ context, question });

  return {
    answer: text,
    sources: hits.map((h, i) => ({
      ref: `#${i + 1}`,
      score: h.score,
      source: h.meta?.source || h.meta?.file || "unknown",
    })),
  };
}

module.exports = { answerQuestion };
