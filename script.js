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

// 품종 데이터
const breeds = {
    개: [
        "말티즈 (Maltese)", "푸들 (Poodle)", "포메라니안 (Pomeranian)", "치와와 (Chihuahua)", 
        "시츄 (Shih Tzu)", "골든 리트리버 (Golden Retriever)", "래브라도 리트리버 (Labrador Retriever)", 
        "비숑 프리제 (Bichon Frise)", "진돗개 (Jindo Dog)", "시바견 (Shiba Inu)", "요크셔 테리어 (Yorkshire Terrier)",
        "닥스훈트 (Dachshund)", "믹스견 (Mixed Breed)"
    ],
    고양이: [
        "코리안 숏헤어 (Korean Shorthair)", "러시안 블루 (Russian Blue)", "페르시안 (Persian)", 
        "샴 (Siamese)", "스코티시 폴드 (Scottish Fold)", "브리티시 숏헤어 (British Shorthair)",
        "노르웨이 숲 (Norwegian Forest Cat)", "랙돌 (Ragdoll)", "아메리칸 숏헤어 (American Shorthair)",
        "믹스묘 (Mixed Breed)"
    ]
};

// 품종 목록 업데이트 함수
function updateBreedDatalist() {
    const selectedSpecies = speciesSelect.value;
    breedList.innerHTML = '';
    breeds[selectedSpecies].forEach(breed => {
        const option = document.createElement('option');
        option.value = breed;
        breedList.appendChild(option);
    });
}

// 탭 전환 함수
function switchTab(event, tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 폼 제출 처리 함수
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
        medicalRecords: document.getElementById('medical-records').value
    };

    const baseInfoPrompt = `### 환자 정보\n- 이름: ${patientData.name}\n- 종: ${patientData.species}\n- 품종: ${patientData.breed}\n- 나이: ${patientData.age}\n- 성별: ${patientData.sex} (${patientData.neutered})\n- 체중: ${patientData.weight} kg\n- 검진일: ${patientData.visitDate}\n- 주요 특이사항: ${patientData.specialNotes}\n- 수의사 치과 소견: ${patientData.dentalFindings}\n\n### 입력된 검사 결과\n${patientData.medicalRecords}\n---`;
    const vetSystemInstruction = `[SYSTEM]\n당신은 고도로 훈련된 수의학 임상 데이터 분석 AI입니다... (전체 수의사 지침)`; // 지침은 생략 없이 모두 포함되어야 합니다.
    const ownerSystemInstruction = `[SYSTEM]\n당신은 보호자의 마음을 깊이 헤아리는 따뜻한 AI 어시스턴트입니다... (전체 보호자 지침)`; // 지침은 생략 없이 모두 포함되어야 합니다.

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
        document.querySelector('.tab-link').click();
    } catch (error) {
        console.error('Error:', error);
        alert(`리포트 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        loader.classList.add('hidden');
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '분석 시작';
    }
}

// Gemini API 호출 함수
async function callGeminiAPI(prompt) {
    // 요청하신 URL을 여기에 정확하게 반영했습니다.
    const CLOUD_FUNCTION_URL = 'https://khhospital-ai-analysis-636821524687.asia-northeast3.run.app';

    const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            prompt: prompt 
        })
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
    return text || ''; // report가 없는 경우 빈 문자열 반환
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    updateBreedDatalist();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visit-date').value = today;
});
speciesSelect.addEventListener('change', updateBreedDatalist);
patientForm.addEventListener('submit', handleFormSubmit);
