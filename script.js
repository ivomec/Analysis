// DOM 요소 가져오기
const speciesSelect = document.getElementById('species');
const breedInput = document.getElementById('breed');
const breedList = document.getElementById('breed-list');
const patientForm = document.getElementById('patient-form');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('results-container');
const vetReportDiv = document.getElementById('vet-report');
const ownerReportDiv = document.getElementById('owner-report');
const analyzeBtn = document.getElementById('analyze-btn');

const imageFilesInput = document.getElementById('image-files');
const audioFilesInput = document.getElementById('audio-files');
const excelFileInput = document.getElementById('excel-file');
const imageFileListDiv = document.getElementById('image-file-list');
const audioFileListDiv = document.getElementById('audio-file-list');
const excelFileListDiv = document.getElementById('excel-file-list');

const breeds = {
    개: ["말티즈", "푸들", "포메라니안", "치와와", "시츄", "골든 리트리버", "래브라도 리트리버", "비숑 프리제", "진돗개", "시바견", "요크셔 테리어", "닥스훈트", "믹스견"],
    고양이: ["코리안 숏헤어", "러시안 블루", "페르시안", "샴", "스코티시 폴드", "브리티시 숏헤어", "노르웨이 숲", "랙돌", "아메리칸 숏헤어", "믹스묘"]
};

function updateBreedDatalist() {
    const selectedSpecies = speciesSelect.value;
    breedList.innerHTML = '';
    breeds[selectedSpecies].forEach(breed => {
        const option = document.createElement('option');
        option.value = breed;
        breedList.appendChild(option);
    });
}

function switchTab(event, tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

function updateFileList(input, listDiv) {
    listDiv.innerHTML = '';
    if (input.files.length > 0) {
        for (const file of input.files) {
            const fileItem = document.createElement('span');
            fileItem.className = 'file-list-item';
            fileItem.textContent = file.name;
            listDiv.appendChild(fileItem);
        }
    }
}

imageFilesInput.addEventListener('change', () => updateFileList(imageFilesInput, imageFileListDiv));
audioFilesInput.addEventListener('change', () => updateFileList(audioFilesInput, audioFileListDiv));
excelFileInput.addEventListener('change', () => updateFileList(excelFileInput, excelFileListDiv));

async function handleFormSubmit(event) {
    event.preventDefault();
    
    loader.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '분석 중...';

    const patientData = {
        name: document.getElementById('patient-name').value,
        species: document.getElementById('species').value,
        breed: document.getElementById('breed').value,
        age: `${document.getElementById('age-years').value || 0}살 ${document.getElementById('age-months').value || 0}개월`,
        sex: document.querySelector('input[name="sex"]:checked').value,
        neutered: document.getElementById('neutered').checked ? '중성화 완료' : '중성화 안함',
        weight: document.getElementById('weight').value,
        visitDate: document.getElementById('visit-date').value,
        specialNotes: document.getElementById('special-notes').value,
        dentalFindings: document.getElementById('dental-findings').value,
    };

    let fileInfoText = '';
    if (imageFilesInput.files.length > 0) {
        fileInfoText += '### 등록된 이미지 파일 목록\n';
        Array.from(imageFilesInput.files).forEach(file => { fileInfoText += `- ${file.name}\n`; });
    }
    if (audioFilesInput.files.length > 0) {
        fileInfoText += '\n### 등록된 오디오 파일 목록\n';
        Array.from(audioFilesInput.files).forEach(file => { fileInfoText += `- ${file.name}\n`; });
    }
    if (excelFileInput.files.length > 0) {
        fileInfoText += `\n### 등록된 엑셀 파일\n- ${excelFileInput.files[0].name}\n`;
    }
    if(fileInfoText === '') fileInfoText = '등록된 검사 파일 없음';

    // (프롬프트 내용은 생략)
    const vetSystemInstruction = `[SYSTEM]
당신은 고도로 훈련된 수의학 임상 데이터 분석 AI입니다...`;
    const ownerSystemInstruction = `[SYSTEM]
당신은 보호자의 마음을 깊이 헤아리는 따뜻한 AI 어시스턴트입니다...`;

    const baseInfoPrompt = `### 환자 정보\n- 이름: ${patientData.name}\n- 종: ${patientData.species}\n- 품종: ${patientData.breed}\n- 나이: ${patientData.age}\n- 성별: ${patientData.sex} (${patientData.neutered})\n- 체중: ${patientData.weight} kg\n- 검진일: ${patientData.visitDate}\n- 주요 특이사항: ${patientData.specialNotes}\n- 수의사 치과 소견: ${patientData.dentalFindings}\n\n### 등록된 검사 파일 정보\n${fileInfoText}\n---`;

    const vetPrompt = vetSystemInstruction + baseInfoPrompt;
    const ownerPrompt = ownerSystemInstruction + baseInfoPrompt;

    try {
        const [vetResponse, ownerResponse] = await Promise.all([
            callGeminiAPI(vetPrompt),
            callGeminiAPI(ownerPrompt)
        ]);
        vetReportDiv.innerHTML = vetResponse;
        ownerReportDiv.innerHTML = ownerResponse;
        resultsContainer.classList.remove('hidden');
        switchTab({ currentTarget: document.querySelector('.tab-link.active') }, 'vet-report');
    } catch (error) {
        console.error('Error:', error);
        
        let detailedErrorMessage = "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

        if (error.message.includes("API 호출 실패")) {
            try {
                const errorJsonText = error.message.split('API 호출 실패: ')[1];
                const errorJson = JSON.parse(errorJsonText);
                const serverErrorText = errorJson.error.split('Server Error: ')[1];
                const serverError = JSON.parse(serverErrorText);
                
                if (serverError.code === 404 && serverError.message.includes("Publisher Model")) {
                     detailedErrorMessage = "치명적 오류: AI 모델을 찾을 수 없습니다.\n\n[원인]\n서버(Cloud Run)에 설정된 AI 모델 이름이 잘못되었거나, 해당 지역에서 지원되지 않습니다.\n\n[해결 방법]\n개발자는 Cloud Run에 배포된 index.js 파일을 열어, Vertex AI 모델 이름을 현재 사용 가능한 최신 버전(예: 'gemini-1.5-pro-001')으로 수정한 후 재배포해야 합니다.";
                } else {
                    detailedErrorMessage = `서버 오류: ${serverError.message}`;
                }
            } catch(e) {
                detailedErrorMessage = `리포트 생성 중 오류가 발생했습니다:\n${error.message}`;
            }
        }
        
        alert(detailedErrorMessage);

    } finally {
        loader.classList.add('hidden');
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '🚀 AI 분석 시작 🚀';
    }
}

async function callGeminiAPI(prompt) {
    // [중요] 아래 주소를 Cloud Run에서 확인한 본인의 실제 서버 주소로 교체해야 합니다.
    const CLOUD_FUNCTION_URL = '여기에_Cloud_Run에서_확인한_새로운_URL을_붙여넣으세요';

    const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 호출 실패: ${errorText}`);
    }
    const data = await response.json();
    let text = data.report;
    if (text) {
        text = text.replace(/^```html\s*/, '').replace(/\s*```$/, '');
    }
    return text || '결과를 생성하지 못했습니다. 입력값을 확인해주세요.';
}

document.addEventListener('DOMContentLoaded', () => {
    updateBreedDatalist();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visit-date').value = today;
});
speciesSelect.addEventListener('change', updateBreedDatalist);
patientForm.addEventListener('submit', handleFormSubmit);
