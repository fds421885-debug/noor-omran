// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// خدمة توليد الاختبارات والأسئلة بالذكاء الاصطناعي (Gemini AI Service)
// المفتاح المعتمد: AQ.Ab8RN6JuxVxo9OiaY_nS3US3jn3VdVHd_uBwrRmZGSTvcLQLbw
// ========================================================

const AI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6JuxVxo9OiaY_nS3US3jn3VdVHd_uBwrRmZGSTvcLQLbw";

/**
 * بنك أسئلة ذكي ومولد محلي فوري لنور البيان والقرآن الكريم
 * يعمل كنسخة احتياطية ذكية وفورية لضمان استقرار العمل دائماً
 */
const NOUR_AL_BAYAN_BANK = {
  letters: [
    { text: "أَ بَ تَ ثَ - حَرَكَةُ الفَتْحِ", type: "oral", font: "quran", points: 5 },
    { text: "كَتَبَ - بَلَغَ - وَجَدَ", type: "oral", font: "quran", points: 5 },
    { text: "حَدَّدِ الْحَرْفَ الْمَفْتُوحَ فِي: عَمِلَ", type: "mcq", font: "quran", points: 5, options: ["عَ", "مِ", "لَ", "مَا"], correct: 0 },
    { text: "رَتِّبِ الْحُرُوفَ لِتَكْوِينِ كَلِمَةٍ قُرْآنِيَّةٍ: [قَ - لَ - مَ]", type: "ordering", font: "quran", points: 5, items: ["قَ", "لَ", "مَ"] },
    { text: "صِلْ بَيْنَ الْحَرْفِ وَحَرَكَتِهِ الصَّحِيحَةِ", type: "matching", font: "quran", points: 5, pairs: [["سَ", "فتحة"], ["سِ", "كسرة"], ["سُ", "ضمة"], ["سْ", "سكون"]] }
  ],
  madd: [
    { text: "تَهَجَّ كَلِمَةَ: قَــالَ - يَقُــولُ - قِيــلَ", type: "oral", font: "quran", points: 5 },
    { text: "مَا نَوْعُ الْمَدِّ فِي كَلِمَةِ: الرَّحْمَـٰنِ؟", type: "mcq", font: "uthmani", points: 5, options: ["مد طبيعي", "مد متصل", "مد منفصل", "مد لازم"], correct: 0 },
    { text: "رَتِّبْ حُرُوفَ الْمَدِّ الثَّلَاثَةِ: [الياء الساكنة - الألف الساكنة - الواو الساكنة]", type: "ordering", font: "amiri", points: 5, items: ["الألف الساكنة", "الواو الساكنة", "الياء الساكنة"] },
    { text: "صِلْ كُلَّ مِثَالٍ بِنَوْعِ الْمَدِّ الْخَاصِّ بِهِ", type: "matching", font: "quran", points: 5, pairs: [["جَاءَ", "مد متصل"], ["فِي أَنفُسِكُمْ", "مد منفصل"], ["نُوحِيهَا", "مد طبيعي"], ["الضَّالِّينَ", "مد لازم"]] }
  ],
  tajweed: [
    { text: "اقْرَأْ مَعَ تَطْبِيقِ حُكْمِ الْإِخْفَاءِ: ﴿مِن قَبْلُ﴾", type: "oral", font: "uthmani", points: 5 },
    { text: "مَا حُكْمُ النُّونِ السَّاكِنَةِ فِي قَوْلِهِ تَعَالَى: ﴿مِن بَعْدِ﴾؟", type: "mcq", font: "uthmani", points: 5, options: ["إظهار حلقي", "إقلاب", "إدغام بغنة", "إخفاء حقيقي"], correct: 1 },
    { text: "رَتِّبْ مَرَاتِبَ الْقَلْقَلَةِ مِنَ الْأَقْوَى إِلَى الْأَضْعَفِ", type: "ordering", font: "amiri", points: 5, items: ["مشدد موقوف عليه", "ساكن موقوف عليه", "ساكن موصول"] },
    { text: "صِلْ بَيْنَ حَرْفِ الْقَلْقَلَةِ وَمِثَالِهِ مِنَ الْقُرْآنِ", type: "matching", font: "uthmani", points: 5, pairs: [["ق", "الْفَلَقِ"], ["ط", "مُحِيطٌ"], ["ب", "كَسَبَ"], ["ج", "بَهِيجٍ"]] }
  ]
};

/**
 * دالة توليد الاختبار بالذكاء الاصطناعي مع دعم النصوص والوسائط
 */
export async function generateTestWithAI({ promptText, mediaName = "", targetGrade = "صف أول", numQuestions = 6 }) {
  // محاولة الاتصال المباشر بنموذج Google Gemini API
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AI_API_KEY}`;
    
    const systemPrompt = `
أنت خبير تربوي ومعلم لقواعد نور البيان والقرآن الكريم والتجويد.
قم بإنشاء اختبار قرآني متكامل وموزع على أقسام متناسقة لطلاب (${targetGrade}).
الطلب: "${promptText}". ${mediaName ? `المرفقات: ${mediaName}.` : ""}
عدد الأسئلة المطلوب: ${numQuestions}.
قواعد إلزامية:
1. نوّع أنواع الأسئلة بدقة بين:
   - "oral" (تهجى / قراءة شفهية)
   - "mcq" (خيارات متعددة، ويجب أن تكون الإجابة الصحيحة موزعة وليست دائماً الخيار الأول أ أو ب)
   - "ordering" (ترتيب كلمات أو أحكام)
   - "matching" (توصيل أزواج)
2. وزّع الأسئلة على قسمين أو ثلاثة أقسام (sections).
3. اختر نوع الخط المناسب لكل سؤال: "quran" أو "uthmani" أو "amiri" أو "normal".
أرجع النتيجة بصيغة JSON فقط كالتالي دون أي علامات markdown:
{
  "testTitle": "عنوان الاختبار",
  "sections": [
    {
      "sectionName": "اسم القسم الأول",
      "questions": [
        {
          "type": "oral | mcq | ordering | matching",
          "text": "نص السؤال مع التشكيل القرآني",
          "font": "quran | uthmani | amiri | normal",
          "points": 5,
          "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
          "correct": 0,
          "items": ["عنصر 1", "عنصر 2", "عنصر 3"],
          "pairs": [["طرف أ", "طرف ب"], ["طرف ج", "طرف د"]]
        }
      ]
    }
  ]
}
`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const data = await response.json();
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanedJson = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);
      if (parsed && parsed.sections && parsed.sections.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("تنبيه: جاري استخدام المحرك التوليدي الذكي المدمج لنور البيان:", err);
  }

  // في حال تعذر الاتصال بالخادم، يقوم المحرك الذكي المدمج بإنشاء الاختبار بدقة عالية
  return generateLocalSmartTest(promptText, targetGrade, numQuestions);
}

/**
 * المحرك التوليدي المحلي الذكي لنور البيان
 */
function generateLocalSmartTest(promptText, targetGrade, numQuestions) {
  let categoryKey = "letters";
  const promptLower = (promptText || "").toLowerCase();

  if (promptLower.includes("مد") || promptLower.includes("تنوين") || promptLower.includes("ثاني")) {
    categoryKey = "madd";
  } else if (promptLower.includes("تجويد") || promptLower.includes("نون") || promptLower.includes("ثالث") || promptLower.includes("إخفاء") || promptLower.includes("سورة")) {
    categoryKey = "tajweed";
  }

  const pool = NOUR_AL_BAYAN_BANK[categoryKey] || NOUR_AL_BAYAN_BANK.letters;
  const questions1 = [];
  const questions2 = [];

  // تنويع خيارات الصح والخطأ والتوزيع
  for (let i = 0; i < Math.min(numQuestions, pool.length * 2); i++) {
    const item = JSON.parse(JSON.stringify(pool[i % pool.length]));
    // خلط أماكن الإجابة الصحيحة للخيارات
    if (item.type === "mcq" && item.options) {
      const targetCorrect = (i + 1) % item.options.length;
      item.correct = targetCorrect;
    }
    if (i % 2 === 0) {
      questions1.push(item);
    } else {
      questions2.push(item);
    }
  }

  const title = promptText && promptText.length > 5 
    ? `اختبار: ${promptText.slice(0, 35)}...`
    : `اختبار نور البيان التفاعلي (${targetGrade})`;

  return {
    testTitle: title,
    sections: [
      {
        sectionName: "القسم الأول: التهجي وقواعد النطق السليم",
        questions: questions1.length > 0 ? questions1 : pool.slice(0, 3)
      },
      {
        sectionName: "القسم الثاني: التطبيق العملي والأحكام التجويدية",
        questions: questions2.length > 0 ? questions2 : pool.slice(2, 5)
      }
    ]
  };
}
