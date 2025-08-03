// 1. 여기에 발급받은 API 키를 입력하세요.
const API_KEY = 'YOUR_API_KEY';
const MODEL_NAME = 'gemini-1.5-pro-latest';

// 2. HTML 요소 가져오기
const analyzeButton = document.getElementById('analyze-button');
const loadingIndicator = document.getElementById('loading');
const resultsContainer = document.getElementById('results');
const reportContent = document.querySelector('#comprehensive-report .content');

// 3. 분석 시작 버튼 이벤트 리스너
analyzeButton.addEventListener('click', analyzeAll);

// 파일 변환 함수
async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type }, fileName: file.name };
}

// 4. 메인 분석 함수
async function analyzeAll() {
    if (API_KEY === 'YOUR_API_KEY') {
        alert('script.js 파일에 유효한 API 키를 입력해주세요.');
        return;
    }
    loadingIndicator.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    reportContent.innerHTML = '';

    try {
        const patientInfo = `
- 환자 이름: ${document.getElementById('patient-name').value || '정보 없음'}
- 품종: ${document.getElementById('patient-breed').value || '정보 없음'}
- 나이: ${document.getElementById('patient-age').value || '정보 없음'}
- 특이사항 및 주요 증상/소견: ${document.getElementById('main-symptoms').value || '정보 없음'}
`;
        
        const parts = [];
        let providedDataSummary = '아래는 분석에 사용될 전체 데이터입니다. 각 데이터는 "--- 다음 파일 ---" 구분자로 나뉩니다.\n';

        const fileInputs = [
            { id: 'internal-medicine-data', type: 'text', name: '내과 검사 결과' },
            { id: 'ophthalmology-file', type: 'file', name: '안과' },
            { id: 'dentistry-file', type: 'file', name: '치과' },
            { id: 'imaging-file', type: 'file', name: '영상의학' },
            { id: 'auscultation-file', type: 'file', name: '청진' },
            { id: 'ecg-file', type: 'file', name: '심전도' }
        ];

        // 각 분야별 상세 프롬프트를 변수로 저장 (★★★★★ 원장님의 모든 지침이 여기에 그대로 포함됩니다 ★★★★★)
        const prompts = {
            internalMedicine: `(여기에 이전에 제공하신 '내과 보호자용' + '내과 수의사용' 지침 전체 텍스트가 들어갑니다. 매우 중요: 보호자용 리포트에는 모든 정상 수치를 포함하고, 수의사용 리포트에는 비정상 수치만 요약하라는 규칙 포함)`,
            ophthalmology: `(여기에 이전에 제공하신 '안과' 지침 전체 텍스트가 들어갑니다.)`,
            dentistry: `(여기에 이전에 제공하신 '치과' 지침 전체 텍스트가 들어갑니다.)`,
            imaging: `(여기에 이전에 제공하신 '영상' 지침 전체 텍스트가 들어갑니다.)`,
            auscultation: `(여기에 이전에 제공하신 '청진' 지침 전체 텍스트가 들어갑니다.)`,
            ecg: `(여기에 이전에 제공하신 '심전도' 지침 전체 텍스트가 들어갑니다.)`
        };

        // 실제 코드에서는 위 `( )` 안에 원장님의 전체 프롬프트를 복사-붙여넣기 해야 합니다.
        // 이 예제에서는 구조를 보여주기 위해 개념적으로 표현합니다.

        let internalAnalysisInstructions = '';

        for (const input of fileInputs) {
            let hasData = false;
            let dataContent = '';
            let fileInfoForPrompt = '';

            if (input.type === 'text') {
                const textData = document.getElementById(input.id).value;
                if (textData) {
                    hasData = true;
                    dataContent = textData;
                    fileInfoForPrompt = `[${input.name}] 텍스트 데이터:\n${dataContent}\n`;
                }
            } else {
                const file = document.getElementById(input.id).files[0];
                if (file) {
                    hasData = true;
                    const filePart = await fileToGenerativePart(file);
                    parts.push(filePart);
                    fileInfoForPrompt = `[${input.name}] 파일 (이름: ${file.name})이 아래 첨부되었습니다.\n`;
                }
            }

            if (hasData) {
                const key = input.id.split('-')[0];
                internalAnalysisInstructions += `
--- 다음 파일 (${input.name}) ---
${fileInfoForPrompt}
[${input.name} 분석 지침]
${prompts[key] || `기본 지침: 제공된 ${input.name} 데이터를 분석하고 보호자용/수의사용 리포트 형식으로 정리하시오.`}
`;
            }
        }


        if (parts.length === 0 && !document.getElementById('internal-medicine-data').value) {
            alert("분석할 데이터를 하나 이상 입력해주세요.");
            loadingIndicator.classList.add('hidden');
            return;
        }

        // ★★★ 모든 지침을 통합한 '메가 마스터 프롬프트' ★★★
        const masterPrompt = `
당신은 '금호동물병원'의 모든 데이터를 통합 분석하는 'AI 진단 마스터 어시스턴트'입니다. 당신의 단 하나의 임무는, 지금부터 제공되는 환자 정보와 여러 종류의 검사 데이터, 그리고 각 데이터를 어떻게 처리해야 하는지에 대한 상세 지침을 모두 읽고, 최종적으로 **하나의 완벽한 통합 HTML 리포트**를 생성하는 것입니다.

**[최상위 절대 임무 및 규칙]**
1.  **자율적 병합:** 당신은 지금부터 주어지는 여러 개의 "파일"과 "분석 지침"을 읽고, 각 파일에 대해 지침대로 분석하여 내부적으로 여러 개의 HTML 리포트 초안을 만듭니다. 그 후, 모든 초안에 **공통적으로 반복되는 헤더(환자 정보)와 푸터(병원 정보)를 자율적으로 식별**하여, 최종 보고서에는 **단 한 번만 사용**해야 합니다.
2.  **내용 절대 불변:** 헤더와 푸터 통합 외에, 각 리포트의 본문 내용(검사 결과, 소견, Q&A 등)은 절대 수정, 요약, 삭제해서는 안됩니다. **특히 보호자용 리포트에는 모든 정상 수치를 반드시 포함해야 합니다.**
3.  **순서 유지:** 제공된 데이터의 순서대로 최종 리포트의 본문 내용이 구성되어야 합니다.
4.  **최종 출력물:** 당신의 최종 응답은 오직 **완벽한 단일 HTML 코드 블록**이어야 합니다. ` + "```html" + ` 로 시작하여 ` + "```" + ` 로 끝나야 하며, 그 외의 어떠한 설명도 포함해서는 안 됩니다.

---
**[환자 정보]**
${patientInfo}
---
**[분석 대상 데이터 및 개별 분석 지침]**
${internalAnalysisInstructions}
---

이제 위의 모든 환자 정보, 데이터, 그리고 각 데이터에 대한 개별 분석 지침을 종합적으로 분석하여, 최종 규칙에 맞는 **단 하나의 완성된 HTML 리포트**를 생성하십시오.
`;

        parts.unshift({ text: masterPrompt });
        const requestBody = { contents: [{ parts }] };
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 호출 실패: ${response.statusText} - ${errorData.error.message}`);
        }

        const responseData = await response.json();
        let resultText = responseData.candidates[0]?.content?.parts[0]?.text || "결과를 받아오는 데 실패했습니다.";
        
        // AI가 생성한 코드 블록을 정리
        if (resultText.startsWith("```html")) {
            resultText = resultText.substring(7);
        }
        if (resultText.endsWith("```")) {
            resultText = resultText.slice(0, -3);
        }

        reportContent.innerHTML = resultText;
        resultsContainer.classList.remove('hidden');

    } catch (error) {
        console.error('분석 중 오류 발생:', error);
        reportContent.innerHTML = `<p style="color: red;">오류가 발생했습니다: ${error.message}</p>`;
        resultsContainer.classList.remove('hidden');
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

// 참고: 위 prompts 객체 안의 "( )" 부분은 실제로는 원장님이 제공하신
// 각 분야별 프롬프트 전체 내용으로 채워져야 완벽하게 작동합니다.
// 코드의 길이를 고려하여 개념적으로만 표시했습니다.