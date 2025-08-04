const { VertexAI } = require('@google-cloud/vertexai');
const express = require('express');
const cors = require('cors');
const app = express();

// [수정] 우리 웹사이트 주소만 허용하도록 CORS 옵션을 상세히 설정합니다.
const corsOptions = {
    origin: 'https://ivonnec.github.io',
    optionsSuccessStatus: 200 // 일부 브라우저 호환성을 위해 204 대신 200 사용
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.status(200).send("<h1>✅ AI 분석 서버가 정상적으로 실행 중입니다.</h1>");
});

app.options('/', cors(corsOptions));

app.post('/', async (req, res) => {
    const vertex_ai = new VertexAI({
        project: 'ai-analysis-467907',
        location: 'us-central1',
    });
    const model = 'gemini-1.0-pro';
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

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running and listening on port ${port}`);
});
