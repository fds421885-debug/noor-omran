// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// البيانات والنماذج الافتراضية المعتمدة (Default Constants & Quizzes)
// ========================================================

import { Quiz } from "../types.ts";

export const DEFAULT_SCHOOLS = [
  "مدرسة نور البيان النموذجية",
  "مدرسة دار الأرقم القرآنية",
  "مجمع الفرقان لتعليم القرآن",
  "مركز الإتقان القرآني"
];

export const DEFAULT_GRADES = [
  "صف أول",
  "صف ثاني",
  "صف ثالث"
];

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: "quiz_default_1",
    title: "اختبار نور البيان - مستوى الحروف والمدود",
    targetGrade: "صف أول",
    allowPractice: true,
    updatedAt: Date.now(),
    sections: [
      {
        sectionName: "القسم الأول: الحروف وحركاتها",
        questions: [
          {
            type: "oral",
            font: "quran",
            text: "اقرأ الكلمات الآتية مع ضبط حركة الفتح:",
            targetOral: "كَتَبَ - بَلَغَ - وَجَدَ",
            points: 5
          },
          {
            type: "mcq",
            font: "quran",
            text: "ما هي الحركة الصحيحة لحرف الميم في كلمة: عَمِلَ؟",
            options: ["فتحة (مَ)", "كسرة (مِ)", "ضمة (مُ)", "سكون (مْ)"],
            correct: 1,
            points: 5
          },
          {
            type: "ordering",
            font: "quran",
            text: "رتب الحروف لتكوين الكلمة القرآنية: [قَ - لَ - مَ]",
            items: ["قَ", "لَ", "مَ"],
            points: 5
          }
        ]
      },
      {
        sectionName: "القسم الثاني: المدود والتنوين",
        questions: [
          {
            type: "oral",
            font: "quran",
            text: "تهجَّ وانطق كلمات المد بالواو بالرسم العثماني:",
            targetOral: "يَقُولُ - نُوحِيهَا",
            points: 5
          },
          {
            type: "matching",
            font: "amiri",
            text: "صل بين الكلمة ونوع المد المناسب:",
            pairs: [
              ["جَاءَ", "مد متصل"],
              ["فِي أَنفُسِكُمْ", "مد منفصل"],
              ["قَالَ", "مد طبيعي"],
              ["الضَّالِّينَ", "مد لازم"]
            ],
            points: 5
          }
        ]
      }
    ]
  },
  {
    id: "quiz_default_2",
    title: "اختبار أحكام النون الساكنة والتجويد",
    targetGrade: "صف ثاني",
    allowPractice: true,
    updatedAt: Date.now(),
    sections: [
      {
        sectionName: "القسم الأول: أحكام النون والتنوين",
        questions: [
          {
            type: "oral",
            font: "quran",
            text: "اقرأ الآية الكريمة مع تطبيق حكم الإقلاب وتسكين الدال عند الوقف:",
            targetOral: "﴿مِن بَعْدِ﴾",
            points: 5
          },
          {
            type: "mcq",
            font: "amiri",
            text: "ما حكم النون الساكنة في قوله تعالى: ﴿مِنْ خَوْفٍ﴾؟",
            options: ["إدغام بغنة", "إظهار حلقي", "إخفاء حقيقي", "إقلاب"],
            correct: 1,
            points: 5
          }
        ]
      }
    ]
  }
];
