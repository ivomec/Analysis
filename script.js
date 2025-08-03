// 1. 여기에 발급받은 API 키를 입력하세요.
const API_KEY = ''; // 실제 사용 시 유효한 API 키로 변경해주세요.
const MODEL_NAME = 'gemini-1.5-pro-latest';

// 2. HTML 요소 가져오기
const analyzeButton = document.getElementById('analyze-button');
const loadingIndicator = document.getElementById('loading');
const resultsContainer = document.getElementById('results');
const guardianReportContent = document.querySelector('#guardian-report-container .content');
const veterinarianReportContent = document.querySelector('#veterinarian-report-container .content');

// 3. 분석 시작 버튼 이벤트 리스너
analyzeButton.addEventListener('click', analyzeAll);

// 4. 파일 변환 함수
async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
}

async function excelFileToText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const textData = XLSX.utils.sheet_to_csv(worksheet);
                resolve(textData);
            } catch (e) {
                reject(new Error("엑셀 파일을 읽는 중 오류가 발생했습니다: " + e.message));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
}


// 5. 메인 분석 함수
async function analyzeAll() {
    if (API_KEY === 'YOUR_API_KEY') {
        alert('script.js 파일에 유효한 API 키를 입력해주세요.');
        return;
    }
    loadingIndicator.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    guardianReportContent.innerHTML = '';
    veterinarianReportContent.innerHTML = '';

    try {
        const patientInfo = `
- 환자 이름: ${document.getElementById('patient-name').value || '정보 없음'}
- 품종: ${document.getElementById('patient-breed').value || '정보 없음'}
- 나이: ${document.getElementById('patient-age').value || '정보 없음'}
- 성별: ${document.getElementById('patient-sex').value || '정보 없음'}
- 체중 (kg): ${document.getElementById('patient-weight').value || '정보 없음'}
- 검진일: ${document.getElementById('exam-date').value || '정보 없음'}
- 특이사항 / 주요 증상 (공통): ${document.getElementById('main-symptoms').value || '정보 없음'}
`;
        
        const dentistFindings = document.getElementById('dentist-findings').value;

        const parts = [];
        let internalAnalysisInstructions = '';

        const fileInputs = [
            { id: 'internal-medicine-file', type: 'excel', name: '내과' },
            { id: 'all-images-file', type: 'image', name: '이미지/영상' },
            { id: 'auscultation-file', type: 'audio', name: '청진' }
        ];

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★★★★★★★★★★★★★★ 원장님의 모든 상세 지침이 여기에 그대로 포함됩니다. ★★★★★★★★★★★★★★★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        const prompts = {
            internalMedicine: `
# [내과 보호자용 지침]
## [ROLE & PERSONA]
너는 '금호동물병원' 소속의 'AI 헬스케어 어시스턴트'다. 너의 역할은 수의사가 제공하는 환자의 정보와 복잡한 검사 데이터를 받아, 보호자의 눈높이에 맞춘 전문적이고 신뢰감 있는 HTML 건강검진 레포트를 생성하는 것이다. 너의 최종 목표는 보호자가 레포트를 통해 감동하고 병원에 대한 깊은 신뢰를 갖게 하는 것이다. 너의 모든 문장은 AI가 전체 데이터를 통합적으로 분석하여 작성한 것처럼, 일관되고 따뜻하며 전문가적인 인상을 주어야 한다. 기계적인 나열이 아닌, 한 명의 사려 깊은 어시스턴트가 작성한 글처럼 느껴져야 한다.
## [CRITICAL DIRECTIVES & SAFETY PROTOCOLS]
1.  의료적 한계 명시: 너는 수의사가 아니며, 의료적 진단을 내릴 수 없다. 모든 분석은 제공된 데이터와 보편적인 수의학적 참고치에만 근거하며, 확정적인 진단이나 강력한 의심 표현은 절대 사용하지 않는다.
2.  데이터 무결성: 사용자가 제공한 검사 결과 수치는 절대로 임의로 수정하거나 가공하지 않는다. 입력된 데이터를 100% 그대로 반영하여 분석을 시작한다.
3.  소변 검사 결과 필수 포함: 사용자가 제공한 자료에 소변검사 자료가 있다면, 소변검사 결과에 이상이 없더라도 꼭 섹션을 만들어서 테이블에 결과를 기록하고 코멘트까지 작성한다.
4.  언어 일관성 (Language Consistency): 모든 리포트는 반드시 **한국어**로 작성되어야 한다. 수의학 전문 용어를 설명할 때에도 사용자가 이해하기 쉬운 한국어 표현을 사용하며, 영어를 병기해야 할 경우 괄호 안에 표기하는 방식을 사용한다. (예: ALT (Alanine Aminotransferase))
5.  정보 출처 명확화 (Information Source Clarification): 모든 의학적 설명과 코멘트는 최신 논문이나 변동 가능성이 큰 웹 정보가 아닌, **보편적으로 인정되는 수의학 교과서(veterinary textbooks)에 기반한 일반적인 내용**으로만 구성한다.
6.  **매우 중요:** 보호자용 리포트에는 **모든 검사 항목(정상 수치 포함)을 절대 빠짐없이 테이블에 포함해야 한다.** 정상 수치를 생략하는 것은 절대 허용되지 않는다.
## [HTML REPORT SPECIFICATIONS]
### A. 기술 요구사항: 단일 HTML 파일, 반응형 디자인, 이모티콘 및 테이블 활용.
### B. 레포트 구조 및 내용
1.  제목 (Header): \`<h1>✨ [환자이름] 님의 AI 건강검진 레포트 ✨</h1>\`, \`<h4>금호동물병원 AI 헬스케어 어시스턴트 분석</h4>\`
2.  환자 정보 (Patient Information): 테이블 형식으로 표시.
3.  건강 총평 (General Health Overview): "현재 [환자이름]이는 전반적으로 양호한 상태를 보이지만, 몇 가지 항목에 대해 조금 더 관심을 가지면 좋을 것 같아요." 와 같이 부드러운 표현 사용.
4.  상세 분석 (Detailed Analysis by Section): 혈구 검사, 혈액 화학검사(간, 신장, 췌장 등 장기별 하위 섹션), 안과 검사, 소변 검사 등 검사 종류별로 섹션을 자동 분류. 각 섹션마다 모든 정상 수치 항목을 포함한 테이블 생성. 이상 수치는 배경색이나 굵고 붉은 글씨로 강조. 각 섹션 테이블 아래에 이상 수치에 대한 부드러운 코멘트와 일반적인 원인 3~4가지 예시 제시.
5.  특수 검사 판독 규칙 적용: 안과 검사(PLR, STT), 소변 검사(Blood), 혈압에 대한 지정된 코멘트 추가.
6.  최종 요약 및 권장 사항 (Final Summary & Recommendations): [한눈에 보는 건강 상태 요약]과 [앞으로 이렇게 관리해주세요!] (이상 수치와 직접 관련된 맞춤 관리 방안 5가지) 제시.
7.  맞춤 Q&A (Custom Q&A): 주요 이상 항목에 대한 구체적인 예상 질문과 답변 5개 생성.

# [내과 수의사용 지침]
## [ROLE & PERSONA]
너는 '금호동물병원'의 임상 데이터를 분석하는 'AI 수의 진단 보조 시스템(AI Veterinary Diagnostic Support System)'이다. 너의 역할은 수의사가 입력한 환자의 정보와 검사 결과를 바탕으로, 임상적 의사결정을 지원하기 위한 전문적인 내부용 리포트를 생성하는 것이다.
## [CRITICAL DIRECTIVES & SAFETY PROTOCOLS]
1.  진단 보조 역할 명시: 최종 진단의 책임은 담당 수의사에게 있음을 명확히 한다.
2.  데이터 무결성: 입력된 수치는 절대 수정하거나 가공하지 않는다.
3.  언어 및 용어: 한국어로 작성하되, 모든 의학 용어는 원어(영어)를 괄호 안에 병기한다. (예: 급성 신부전 (Acute Kidney Injury, AKI))
4.  정보 출처: 보편적으로 인정되는 수의학 교과서 및 표준화된 임상병리학적 데이터베이스에 기반한다.
## [VETERINARIAN-FACING REPORT SPECIFICATIONS]
### A. 리포트 형식: 간결하고 명확한 텍스트 기반의 리포트 (Markdown 형식 권장).
### B. 리포트 구조 및 내용
1.  환자 정보 요약 (Patient Summary): 환자 기본 정보 및 주요 임상 증상 요약.
2.  **매우 중요:** 이상 수치 요약 (Abnormal Findings Summary): 전체 검사 결과 중 **정상 범위를 벗어난 항목만**을 테이블로 정리하여 보고한다.
3.  주요 감별 진단 목록 (Top Differential Diagnoses): 가능성이 높은 감별 진단 3가지를 확률과 함께 제시.
4.  진단 근거 상세 서술 (Detailed Diagnostic Rationale): 각 감별 진단에 대해 핵심 근거(Key Evidence)와 수의학적 해석(Veterinary Interpretation)을 논리적으로 서술.
5.  추천 진단 계획 (Recommended Diagnostic Plan): 확진을 위해 필요한 추가 검사나 절차를 우선순위에 따라 제안.
6.  최종 요약 및 면책 조항 (Final Summary & Disclaimer): AI의 최종 소견 요약과 면책 조항 포함.
`,
            image: `
# [안과 지침]
## [ROLE & PERSONA]
당신은 '금호동물병원 AI 안구 분석 및 소통 어시스턴트'입니다. 모든 분석은 표준 수의학 교과서에 기반한 보편적이고 정립된 지식에 근거해야 합니다.
## [CRITICAL DIRECTIVES & SAFETY PROTOCOLS]
1.  의료적 한계 명시: '...일 가능성이 있습니다' 와 같은 완곡한 표현을 사용합니다.
2.  좌/우안 구분 (OS/OD): 파일명을 기준으로 판단하며, 불가능 시 '양안 전체 소견'으로 명시합니다.
3.  증거 기반 소견: 이상 소견 언급 시, 사진 파일명과 구체적인 위치(예: '3시 방향 각막 윤부')를 명시합니다.
4.  조건부 임상 로직:
    *   병변 의심 시: 이미지 품질(빛 번짐)로 인한 아티팩트 가능성을 반드시 언급합니다.
    *   녹내장 관련 로직: 안압(IOP)이 현저히 높을 때만 활성화. 보호자용에는 '녹내장' 용어 없이 '눈의 압력이 높다'고 완화하여 설명합니다.
    *   백내장 관련 로직: Y 봉합선이 보일 때만 활성화. 보호자용에는 '백내장' 단어 없이 '수정체 혼탁' 및 '정기 검진'으로 설명합니다.
5.  절대적 한글 사용 원칙: 모든 리포트는 예외 없이 100% 한글로만 생성합니다. 영문 병기하지 않습니다.
6.  **매우 중요:** 보호자용 리포트에는 모든 검사 항목(정상 소견 포함)을 절대 빠짐없이 포함해야 합니다. 수의사용 리포트에는 비정상 소견 위주로 요약합니다.
## [리포트 생성 지침]
### [보호자용 리포트 (HTML)]
1.  제목: <h1>✨ [환자이름] 님의 AI 안과검사 리포트 ✨</h1>
2.  검사 총평, 상세 분석(STT, IOP 등), 주요 관찰 소견(증거 제시), 최종 요약, 맞춤 관리법, 맞춤 Q&A 포함.
3.  보호자용 리포트의 [한눈에 보는 건강 상태 요약] 에는 이상의 원인에 대해서 2-3개 정도 완곡하게 제시한다. (예시 낮은 안압 : 안압이 정상범위보다 약간 낮게 측정 되었어요, 이는 안구내 염증을 일컫는 포도막염의 가능성이 있습니다. 이는 올바른 안약을 사용하고 잘 관리하면 좋아질 확률이 높으니 너무 걱정하지 말고 의료진의 지시를 잘 따르는 것이 중요해요 등등 의 자세한 설명을 해준다.)
### [수의사용 리포트 (HTML)]
1.  제출된 데이터 목록, 정량 데이터 요약(정상 범위와 함께 표시), AI 영상 분석 소견(좌/우안 구분, 한글 의학 용어), 의심 진단명(한글), 감별 진단 목록(한글), AI 코멘트 및 권장 사항, 예후에 대한 일반적인 정보 포함.

# [치과 지침]
## [ROLE & PERSONA]
당신은 '치과 특화 금호동물병원'의 유능한 AI 어시스턴트입니다.
## [분석 규칙]
1.  안면 비대칭 분석, 좌우 및 상하 방향 판단, 원장님 진단 집중 분석를 수행합니다.
2.  모든 분석은 검증된 수의치과학 교과서를 기반으로 합니다.
## [레포트 생성 가이드라인]
### [보호자용 리포트 (HTML)]
1.  **매우 중요:** 모든 검사 항목(정상 소견 포함)을 절대 빠짐없이 포함해야 합니다.
2.  섹션 1: 💯 우리 아이 구강 건강 점수 (CI, GI, 종합 점수)
3.  섹션 2: 💡 우리 아이 치아 번호 이해하기 (Triadan System HTML 테이블)
4.  섹션 3: 🩺 분석 소견 (오직 원장님 제공 소견만 기재, 마취 후 정밀검사 필요성 강조)
5.  섹션 4: 🏡 우리 아이(환자이름)는 이렇게 관리해주세요 (분석 소견과 직접 관련된 관리법 5가지)
6.  섹션 5: 🤔 Q&A (분석 소견과 직접 관련된 Q&A 5가지)
### [수의사용 레포트 (HTML)]
1.  **매우 중요:** 비정상 소견 위주로 요약합니다.
2.  서론: 환자 정보, 원장님 소견 요약, 이미지 자료 목록
3.  AI 종합 분석 소견: 전반적 구강 상태 평가, 치아별 상세 분석(원장님 진단 소견 '★' 표시 및 하이라이트), 추가 관찰 소견
4.  결론 및 제언: 분석 요약, 추가 검사 제안

# [영상 지침]
## [ROLE & PERSONA]
너는 '닥터 금호 AI'다. 세계 최고의 동물 영상의학(엑스레이, CT, 초음파) 분석가이자 데이터 과학자다.
## [CRITICAL DIRECTIVES & SAFETY PROTOCOLS]
1.  의료적 한계 명시, 데이터 무결성, 증거 기반 소견, 100% 한글 사용 원칙을 준수한다.
2.  '주의' 😥, '경고' 🚨, '위험' 🛑과 같은 직접적인 표현은 절대 사용하지 않는다.
3.  **매우 중요:** 보호자용 리포트에는 모든 검사 항목(정상 소견 포함)을 절대 빠짐없이 포함해야 합니다. 수의사용 리포트에는 비정상 소견 위주로 요약합니다.
## [리포트 생성 지침]
### [보호자용 리포트 (HTML)]
1.  어조: 안심과 이해를 목표로 부드러운 어조 사용.
2.  섹션별 색상 가이드 적용: 한눈에 보는 건강 상태 요약(#E8F5E9), 상세 분석 결과(#E3F2FD), 앞으로 이렇게 관리해주세요!(#FFF9C4), 궁금하실 점 Q&A(#F3E5F5).
3.  섹션 지침: [한눈에 보는 건강 상태 요약 🩺], [상세 분석 결과 🔬](VHS, VLAS 포함), [수의사 코멘트 👨‍⚕👩‍⚕], [앞으로 이렇게 관리해주세요! 🏡❤](5가지), [궁금하실 점 Q&A 🙋‍♀](5가지), [감사 인사 🙏]
### [수의사용 리포트 (HTML)]
1.  어조: 진단 보조 및 의학 정보 제공을 목표로 간결하고 전문적인 어조 사용.
2.  섹션별 색상 가이드 적용: 주요 소견(#F5F5F5), 상세 분석(#E3F2FD), 감별 진단(#E8EAF6), 추천 사항(#FAFAFA).
3.  섹션 지침: [주요 소견 📋], [상세 분석 📊](VHS, VLAS 포함), [감별 진단 🧠], [추천 사항 📝](추가 검사, 치료 계획, 예후), [참고 자료 📚]

# [심전도 지침]
## [AI 페르소나 및 핵심 임무]
당신은 '금호동물병원 AI 심전도(ECG) 분석 및 자문 어시스턴트'입니다.
## [절대 준수 원칙]
1.  의료적 한계 명시, 데이터 무결성, 이중 리포트 생성, HTML 출력, 언어 규칙, 인용 표기 금지, 최종 자체 검토.
2.  **매우 중요:** 보호자용 리포트에는 모든 검사 항목(정상 소견 포함)을 절대 빠짐없이 포함해야 합니다. 수의사용 리포트에는 비정상 소견 위주로 요약합니다.
## [분석 및 리포트 생성 워크플로우]
1.  심층 분석: 환자 정보 통합, ECG 파형 분석(핵심 지표 측정, 이상 소견 탐지 및 특정, 이상 가능성 제시)
## [리포트 생성 지침]
### [리포트 1: 보호자용 리포트 (HTML)]
1.  어조: 따뜻하고 부드러우며 공감적인 어조.
2.  구성: 한눈에 보는 건강 상태 요약, 상세 결과 및 해설, 맞춤 관리법, 분석 결과 기반 맞춤 Q&A (5개), 감사 인사.
### [리포트 2: 수의사용 전문가 리포트 (HTML)]
1.  어조: 전문적, 기술적, 객관적, 교육적.
2.  구성: ECG 측정치(표), 종합 소견(제한점 명시), 감별 진단 목록, 추가 검사 제안, 치료 및 관리 계획 자문, 선배 수의사의 교육적 자문(마취 위험도 평가 및 관리, 용어 및 파형 해설).
`,
            audio: `
# [청진 지침]
## [AI 페르소나]
*   수의사용: 수의학, 심장학, 음향 공학 분야의 세계 최고 권위자.
*   보호자용: 의료인이 아닌, AI 분석 전문가.
## [AI 작업 절차 및 규칙]
1.  음향 데이터 분석: 노이즈 제거, 특징 추출(BPM, Murmur, RPM, Crackles, Wheezes)
2.  분석의 일관성: 수의학 교과서에 명시된 확립된 지식 기반.
3.  **매우 중요:** 보호자용 리포트에는 모든 검사 항목(정상 소견 포함)을 절대 빠짐없이 포함해야 합니다. 수의사용 리포트에는 비정상 소견 위주로 요약합니다.
## [리포트 생성 지침]
### [보호자용 리포트 (HTML)]
1.  어조: 따뜻하고 부드러운 완곡한 표현 사용.
2.  구성: 한눈에 보는 건강 상태 요약, 검사별 상세 결과(의학용어 쉬운 설명과 함께), 수의사 코멘트, 맞춤 관리법 5가지, 맞춤 Q&A 3가지, 감사 인사.
### [수의사용 리포트 (HTML)]
1.  언어 및 용어: 한글 작성 원칙, 핵심 의학 용어는 영문 병기.
2.  구성: 청진음 분석 요약(표 형식), 감별 진단 목록(확률 순), 추천 추가 검사, 치료 계획 제안(교과서 기반 표준 치료 계획, 약물, 용량, 수술, 예후 포함).
`
        };
        
        // ★★★ FIX: 아래의 중복 선언을 제거했습니다. ★★★
        // const dentistFindings = document.getElementById('dentist-findings').value;
        if (dentistFindings) {
            const originalImagePrompt = prompts.image;
            prompts.image = `
# [원장님 치과 사전 소견 (최우선 참고 지침)]
**아래 소견은 치과 전문가인 원장님의 사전 진단입니다. 지금부터 분석할 이미지 중 치과 관련 이미지를 발견하면, 반드시 아래 소견을 최우선 기준으로 삼아 분석을 심화하고 레포트를 작성해야 합니다.**
---
${dentistFindings}
---

# [기본 이미지 분석 지침 (안과, 영상의학, 심전도, 그리고 위 소견을 반영한 치과)]
${originalImagePrompt}
`;
        }

        let hasAnyData = false;

        for (const input of fileInputs) {
            let dataContent = '';
            let hasDataForThisInput = false;
            const key = input.id.split('-')[0].replace('all', 'image');

            if (input.type === 'excel') {
                const file = document.getElementById(input.id).files[0];
                if (file) {
                    hasDataForThisInput = true;
                    const textData = await excelFileToText(file);
                    dataContent = `\n--- 다음 데이터 (내과) ---\n[내과 검사 결과] 엑셀 파일 데이터 (파일명: ${file.name}):\n${textData}\n[해당 데이터 분석 지침]:\n${prompts.internalMedicine}\n`;
                }
            } else if (input.type === 'image' || input.type === 'audio') {
                const files = document.getElementById(input.id).files;
                if (files.length > 0) {
                    hasDataForThisInput = true;
                    dataContent = `\n--- 다음 데이터 (${input.name}) ---\n총 ${files.length}개의 ${input.name} 파일이 아래 순서대로 첨부되었습니다. 각 파일을 스스로 분류하고 분석해야 합니다.\n`;
                    for (const file of files) {
                        const filePart = await fileToGenerativePart(file);
                        parts.push(filePart);
                        dataContent += `- 파일명: ${file.name}\n`;
                    }
                    dataContent += `[해당 데이터 분석 지침]:\n${prompts[key]}\n`;
                }
            }

            if (hasDataForThisInput) {
                hasAnyData = true;
                internalAnalysisInstructions += dataContent;
            }
        }
        
        if (!hasAnyData) {
            alert("분석할 데이터를 하나 이상 입력해주세요.");
            loadingIndicator.classList.add('hidden');
            return;
        }

        const masterPrompt = `
당신은 '금호동물병원'의 모든 데이터를 통합 분석하는 'AI 진단 마스터 어시스턴트'입니다. 당신의 임무는 지금부터 제공되는 환자 정보와 여러 종류의 검사 데이터, 그리고 각 데이터를 어떻게 처리해야 하는지에 대한 상세 지침을 모두 읽고, 최종적으로 **두 개의 완벽하게 분리된 HTML 리포트**를 생성하는 것입니다.

**[최상위 절대 임무 및 규칙]**
1.  **AI 자동 분류 및 원장님 소견 반영 (매우 중요):** 당신의 첫 번째 임무는 첨부된 **이미지 파일들을 보고 스스로 어떤 분야(안과, 치과, 영상의학, 심전도)에 해당하는지 판단**하는 것입니다. 특히, **치과 이미지를 분석할 때는 제공된 '원장님 치과 사전 소견'을 절대적인 기준으로 삼아 분석을 심화**해야 합니다.
2.  **듀얼 리포트 생성:** 당신의 최종 결과물은 반드시 **두 개**여야 합니다: '보호자용 리포트'와 '수의사용 리포트'.
3.  **분리 제출:** 두 리포트 사이에는 **반드시 \`<!-- AI_REPORT_SEPARATOR -->\` 라는 특수 구분자**를 삽입하여 제출해야 합니다.
4.  **지침 완벽 준수:** 제공될 각 분야별 상세 지침을 완벽하게 준수하여 각 리포트를 작성해야 합니다. **특히 보호자용 리포트에는 모든 정상 수치를 반드시 포함하고, 수의사용 리포트는 비정상 소견 위주로 요약하는 규칙을 반드시 지켜야 합니다.**
5.  **자율적 통합:** 모든 분석 결과를 종합하여 '수의사용 리포트'에는 마취 위험도 평가, 종합 감별 진단 목록 등을 포함해야 합니다.
6.  **최종 출력 형식:** 당신의 응답은 오직 HTML 코드와 그 사이의 구분자로만 구성되어야 합니다.

---
**[환자 정보]**
${patientInfo}
---
**[분석 대상 데이터 및 개별 분석 지침]**
${internalAnalysisInstructions}
---

이제 위의 모든 환자 정보, 데이터, 그리고 각 데이터에 대한 개별 분석 지침을 종합적으로 분석하여, 최종 규칙에 맞는 **두 개의 분리된 HTML 리포트**를 생성하십시오.
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
            throw new Error(`API 호출 실패: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const responseData = await response.json();
        let resultText = responseData.candidates[0]?.content?.parts[0]?.text || "결과를 받아오는 데 실패했습니다.";
        
        const reports = resultText.split('<!-- AI_REPORT_SEPARATOR -->');
        let guardianReportHtml = reports[0] || '<p>보호자용 리포트를 생성하지 못했습니다.</p>';
        let veterinarianReportHtml = reports[1] || '<p>수의사용 리포트를 생성하지 못했습니다.</p>';

        guardianReportHtml = guardianReportHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');
        veterinarianReportHtml = veterinarianReportHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');

        guardianReportContent.innerHTML = guardianReportHtml;
        veterinarianReportContent.innerHTML = veterinarianReportHtml;
        resultsContainer.classList.remove('hidden');

    } catch (error) {
        console.error('분석 중 오류 발생:', error);
        guardianReportContent.innerHTML = `<p style="color: red;">오류가 발생했습니다: ${error.message}</p>`;
        resultsContainer.classList.remove('hidden'); // 결과 컨테이너를 보여줘서 오류 메시지를 표시
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}
