// 필요한 모든 라이브러리를 가져옵니다.
const { VertexAI } = require('@google-cloud/vertexai');
const express = require('express');
const cors = require('cors');

// Express 앱을 초기화합니다.
const app = express();

// CORS 미들웨어를 가장 먼저, 그리고 가장 개방적인 설정으로 사용합니다.
app.use(cors());

// JSON 요청 본문을 파싱하기 위한 미들웨어를 적용합니다.
app.use(express.json({ limit: '50mb' }));

// 서버 진단용 GET 핸들러
app.get('/', (req, res) => {
  res.status(200).send("<h1>✅ AI 분석 서버가 정상적으로 실행 중입니다.</h1>");
});

// POST 요청 처리 로직
app.post('/', async (req, res) => {
    // VertexAI 클라이언트 초기화
    // [최종 설정] location을 한국에서 가까운 'asia-northeast1'(도쿄)으로 변경합니다.
    const vertex_ai = new VertexAI({
        project: 'ai-analysis-467907',
        location: 'asia-northeast1',
    });

    // 안정적인 최신 모델을 사용합니다.
    const model = 'gemini-1.5-pro-latest';

    // 모델 초기화
    const generativeModel = vertex_ai.getGenerativeModel({ model });

    try {
        const prompt = req.body.prompt;
        if (!prompt) {
            return res.status(400).json({ error: 'prompt is missing' });
        }

        const resp = await generativeModel.generateContent(prompt);
        const contentResponse = await resp.response;
        const reportText = contentResponse.candidates[0].content.parts[0].text;

        res.status(200).json({ report: reportText });

    } catch (error) {
        console.error("Error during POST request processing:", error);
        res.status(500).json({ error: `Server Error: ${error.message}` });
    }
});

// 서버를 시작합니다.
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running and listening on port ${port}`);
});