const { VertexAI } = require('@google-cloud/vertexai');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.get('/', (req, res) => {
  res.status(200).send("<h1>✅ AI 분석 서버가 정상적으로 실행 중입니다.</h1>");
});

// [수정] OPTIONS 요청을 명시적으로 처리하는 코드 추가
app.options('/', cors());

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
