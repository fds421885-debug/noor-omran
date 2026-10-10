// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// بنك البطاقات التكتيكية الكامل (40 بطاقة ذكية ومتنوعة)
// تظهر للمتسابقين كل ربع الأسئلة في المسابقات الحية
// ========================================================

export const TACTICAL_CARDS = [
  {
    id: 1,
    title: "تيسير الوقت",
    desc: "زيادة 5 ثوانٍ إضافية لربع الأسئلة القادمة",
    icon: "fa-hourglass-start",
    type: "buff",
    effect: { timeDelta: 5, durationQuestions: 5, pointsBonus: 0 }
  },
  {
    id: 2,
    title: "سرعة وإتقان",
    desc: "إنقاص 5 ثوانٍ مع الحصول على +2 درجة إضافية لكل إجابة صحيحة",
    icon: "fa-bolt",
    type: "risk",
    effect: { timeDelta: -5, durationQuestions: 5, pointsBonus: 2 }
  },
  {
    id: 3,
    title: "المخاطرة الكبرى",
    desc: "الحصول على الدرجة كاملة (5 نقاط) ولكن الخطأ يخصم 3 نقاط",
    icon: "fa-fire-flame-curved",
    type: "risk",
    effect: { timeDelta: 0, durationQuestions: 5, pointsBonus: 0, penaltyOnWrong: 3 }
  },
  {
    id: 4,
    title: "درع الأمان",
    desc: "حماية تامة من أي خصم أو خسارة درجات للسؤال القادم",
    icon: "fa-shield-halved",
    type: "buff",
    effect: { immunity: true, durationQuestions: 1 }
  },
  {
    id: 5,
    title: "حذف خيارين",
    desc: "حذف خيارين خاطئين تلقائياً في أول سؤال خيارات قادم",
    icon: "fa-filter",
    type: "buff",
    effect: { eliminateOptions: 2 }
  },
  {
    id: 6,
    title: "استشارة المعلم",
    desc: "منح المعلم 10 ثوانٍ لتوجيه نصيحة توضيحية للطالب قبل الإجابة",
    icon: "fa-chalkboard-user",
    type: "buff",
    effect: { teacherHelp: true }
  },
  {
    id: 7,
    title: "السؤال الذهبي",
    desc: "مضاعفة نقاط السؤال القادم (10 نقاط بدلاً من 5) عند الإجابة الصحيحة",
    icon: "fa-coins",
    type: "buff",
    effect: { doublePoints: true }
  },
  {
    id: 8,
    title: "تجميد الوقت",
    desc: "إيقاف العداد الزمني لمدة 10 ثوانٍ للتفكير بهدوء في السؤال الحالي",
    icon: "fa-snowflake",
    type: "buff",
    effect: { freezeTime: 10 }
  },
  {
    id: 9,
    title: "استبدال السؤال",
    desc: "إمكانية استبدال السؤال الحالي بسؤال آخر من نفس القسم لمرة واحدة",
    icon: "fa-arrows-rotate",
    type: "buff",
    effect: { swapQuestion: true }
  },
  {
    id: 10,
    title: "هدوء وسكينة",
    desc: "إضافة 10 ثوانٍ كاملة للسؤال الحالي فقط",
    icon: "fa-clock",
    type: "buff",
    effect: { timeDelta: 10, durationQuestions: 1 }
  },
  {
    id: 11,
    title: "نجمة التلاوة",
    desc: "منح +1 درجة فورية إضافية في التقييم الشفهي للسؤال القادم",
    icon: "fa-star",
    type: "buff",
    effect: { oralBonus: 1 }
  },
  {
    id: 12,
    title: "نَفَس عميق",
    desc: "زيادة 3 ثوانٍ لكل سؤال حتى نهاية القسم الحالي",
    icon: "fa-wind",
    type: "buff",
    effect: { timeDelta: 3, durationQuestions: 4 }
  },
  {
    id: 13,
    title: "عين الصواب",
    desc: "تلميح ذكي يحدد أول حرف أو موضع الحكم التجويدي الصحيح",
    icon: "fa-eye",
    type: "buff",
    effect: { hint: true }
  },
  {
    id: 14,
    title: "تحدي الأبطال",
    desc: "تقليص الوقت للنصف مع نيل +3 درجات بونص عند الصواب",
    icon: "fa-medal",
    type: "risk",
    effect: { halfTime: true, pointsBonus: 3 }
  },
  {
    id: 15,
    title: "فرصة ثانية",
    desc: "إذا أخطأ الطالب يُمنح فرصة ثانية فورية لإعادة المحاولة",
    icon: "fa-arrow-rotate-left",
    type: "buff",
    effect: { secondChance: true }
  },
  {
    id: 16,
    title: "بركة الإتقان",
    desc: "إلغاء احتساب أي خطأ بسيط في فواصل التقييم ومنح الدرجة الكاملة",
    icon: "fa-hand-holding-heart",
    type: "buff",
    effect: { graceRound: true }
  },
  {
    id: 17,
    title: "حصانة الترتيب",
    desc: "في أسئلة الترتيب: تثبيت أول عنصرين في موقعهما الصحيح تلقائياً",
    icon: "fa-lock",
    type: "buff",
    effect: { lockTwoItems: true }
  },
  {
    id: 18,
    title: "توصيل الحكمة",
    desc: "في أسئلة التوصيل: توصيل أول زوجين صحيحين تلقائياً",
    icon: "fa-link",
    type: "buff",
    effect: { autoMatchOne: true }
  },
  {
    id: 19,
    title: "نور البيان",
    desc: "كشف القاعدة التجويدية المرتبطة بالسؤال فور ظهوره",
    icon: "fa-book-quran",
    type: "buff",
    effect: { showRuleHint: true }
  },
  {
    id: 20,
    title: "مكافأة الثبات",
    desc: "الحصول على +1 نقطة إضافية لكل إجابة صحيحة متتالية (Combo)",
    icon: "fa-chart-line",
    type: "buff",
    effect: { streakMultiplier: true }
  },
  {
    id: 21,
    title: "سهم الانطلاق",
    desc: "تجاوز سؤال واحد دون فقدان درجاته والانتقال للتالي مباشرة",
    icon: "fa-forward",
    type: "buff",
    effect: { passQuestion: true }
  },
  {
    id: 22,
    title: "درع التقييم",
    desc: "يمنع أي معلم من إعطاء تقييم أقل من 4 درجات في السؤال الشفهي",
    icon: "fa-shield",
    type: "buff",
    effect: { minRating: 4 }
  },
  {
    id: 23,
    title: "صوت الواثق",
    desc: "إلغاء التوقيت تماماً للسؤال الشفهي القادم والقراءة براحة تامة",
    icon: "fa-microphone",
    type: "buff",
    effect: { noTimeLimit: true }
  },
  {
    id: 24,
    title: "إعادة ترتيب الأوراق",
    desc: "تبديل ترتيب الأسئلة القادمة في القسم حسب الرغبة",
    icon: "fa-shuffle",
    type: "buff",
    effect: { reorderDeck: true }
  },
  {
    id: 25,
    title: "قلب الموازين",
    desc: "تحويل السؤال القادم إلى سؤال بونص يمنح 7 درجات كاملة",
    icon: "fa-gem",
    type: "buff",
    effect: { bonus7Points: true }
  },
  {
    id: 26,
    title: "التأني والسلامة",
    desc: "إضافة 15 ثانية لرصيد الوقت الإجمالي للمتسابق",
    icon: "fa-clock-rotate-left",
    type: "buff",
    effect: { totalBankTime: 15 }
  },
  {
    id: 27,
    title: "عين الحافظ",
    desc: "إظهار الآية السابقة واللاحقة لمساعدة المتسابق في التهجي والتلاوة",
    icon: "fa-compass",
    type: "buff",
    effect: { verseContext: true }
  },
  {
    id: 28,
    title: "مضاعف الشرف",
    desc: "زيادة مركزين فوراً في لوحة الشرف عند الإجابة الصحيحة",
    icon: "fa-arrow-up-right-dots",
    type: "buff",
    effect: { rankBoost: true }
  },
  {
    id: 29,
    title: "السؤال المفتوح",
    desc: "حرية اختيار رقم السؤال التالي يدوياً بدلاً من السحب العشوائي",
    icon: "fa-list-ol",
    type: "buff",
    effect: { pickExactQuestion: true }
  },
  {
    id: 30,
    title: "حزام الأمان التجويدي",
    desc: "تسامح في خطأ واحد في أحكام الغنة أو المد دون إنقاص الدرجة",
    icon: "fa-circle-check",
    type: "buff",
    effect: { forgivingTajweed: true }
  },
  {
    id: 31,
    title: "الإيقاع السريع",
    desc: "إجابة في أقل من 5 ثوانٍ تمنح +3 نقاط إضافية على الفور",
    icon: "fa-forward-fast",
    type: "risk",
    effect: { speedBonusUnder5s: 3 }
  },
  {
    id: 32,
    title: "نور الصدر",
    desc: "إظهار علامات الضبط والمخارج الملونة في الكلمة القرآنية للسؤال",
    icon: "fa-highlighter",
    type: "buff",
    effect: { coloredHarakat: true }
  },
  {
    id: 33,
    title: "مساعدة الزميل",
    desc: "يحق لأحد المعلمين الحاضرين في الغرفة توجيه تنبيه إيجابي",
    icon: "fa-user-group",
    type: "buff",
    effect: { peerHelp: true }
  },
  {
    id: 34,
    title: "طاقة العزيمة",
    desc: "إعادة تعيين وقت السؤال بالكامل إذا شارف على الانتهاء",
    icon: "fa-battery-full",
    type: "buff",
    effect: { resetQuestionTimer: true }
  },
  {
    id: 35,
    title: "وسام الشرف القرآني",
    desc: "تسجيل نقطة شرف إضافية تضاف للمجموع النهائي في نهاية المسابقة",
    icon: "fa-award",
    type: "buff",
    effect: { honorBadge: true }
  },
  {
    id: 36,
    title: "توازن الحكماء",
    desc: "تقسيم درجات السؤال بين الدقة والسرعة بالتساوي",
    icon: "fa-scale-balanced",
    type: "buff",
    effect: { balanceScore: true }
  },
  {
    id: 37,
    title: "صمام الأمان النهائي",
    desc: "الاحتفاظ بأعلى درجة حصل عليها الطالب حتى لو تعثر في سؤال لاحق",
    icon: "fa-vault",
    type: "buff",
    effect: { lockHighestScore: true }
  },
  {
    id: 38,
    title: "الخط العثماني الميسر",
    desc: "تكبير حجم الخط القرآني بنسبة 150% مع إضاءة خلفية واضحة للكلمة",
    icon: "fa-magnifying-glass-plus",
    type: "buff",
    effect: { zoomScript: true }
  },
  {
    id: 39,
    title: "السؤال المشترك",
    desc: "يشارك المعلمون بتحديد جزء السؤال الأكثر ملاءمة لمستوى الطالب",
    icon: "fa-people-arrows",
    type: "buff",
    effect: { adaptiveQuestion: true }
  },
  {
    id: 40,
    title: "ختام المسك",
    desc: "منح 5 نقاط كاملة تلقائية لآخر سؤال في المسابقة تقديراً للاجتهاد",
    icon: "fa-crown",
    type: "buff",
    effect: { finaleBonus: true }
  }
];

/**
 * اختيار 3 بطاقات ذكية عشوائياً للمتسابق
 */
export function getRandomTacticalCards(count = 3) {
  const shuffled = [...TACTICAL_CARDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
