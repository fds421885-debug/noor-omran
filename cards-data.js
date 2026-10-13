// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// بنك البطاقات التكتيكية الكامل (40 بطاقة تكتيكية ذكية ومتنوعة)
// تم إعدادها وفق المعايير التنفيذية الدقيقة للمسابقات القرآنية المباشرة
// ========================================================

/**
 * أنواع مدة وسريان البطاقات:
 * - instant: فوري على السؤال الحالي (أو القادم المحدد) وينتهي بنهايته
 * - cycle: مستمر حتى ظهور مجموعة البطاقات التالية (كل 4 أسئلة)
 * - permanent: مكافأة دائمة لا تُحذف عند انتهاء الدورة (مثل وسام الشرف)
 * - match: مستمر حتى نهاية المسابقة الحالية (مثل صمام الأمان النهائي)
 *
 * الفئات:
 * - buff: ميزة إيجابية
 * - risk: مخاطرة ذكية
 *
 * التوافق:
 * - all: جميع أنواع الأسئلة
 * - mcq: اختيار من متعدد فقط
 * - oral: تقييم شفهي وتلاوة فقط
 * - matching: توصيل ومطابقة فقط
 * - ordering: ترتيب عناصر وكلمات فقط
 * - timer: أسئلة تستخدم مؤقتاً زمنياً
 * - final: آخر سؤال في المسابقة
 */

export const TACTICAL_CARDS = [
  {
    id: 1,
    title: "تيسير الوقت",
    desc: "زيادة 5 ثوانٍ إضافية لكل سؤال صالح خلال دورة البطاقات الحالية",
    icon: "fa-hourglass-start",
    type: "buff",
    scope: "cycle",
    applicableTo: "timer",
    effect: { timeDeltaPerQuestion: 5 },
    mechanicsText: "تأثير مستمر حتى ظهور مجموعة البطاقات التالية: يمنح المتسابق خمس ثوانٍ إضافية لكل سؤال صالح خلال دورة البطاقات الحالية (كل 4 أسئلة)، مع الحفاظ على وقت بقية المتسابقين."
  },
  {
    id: 2,
    title: "سرعة وإتقان",
    desc: "تقليص الوقت 5 ثوانٍ مع الحصول على +2 نقطة إضافية عند الإجابة الصحيحة",
    icon: "fa-bolt",
    type: "risk",
    scope: "instant",
    applicableTo: "timer",
    effect: { timeDelta: -5, pointsBonus: 2, minTimeRequired: 6 },
    mechanicsText: "مخاطرة ذكية فورية: ينقص 5 ثوانٍ من المؤقت الحالي، ويمنح المتسابق نقطتين إضافيتين إذا أجاب إجابة صحيحة معتمدة. لا تمنح المكافأة للخطأ، ولا يسمح بالتفعيل إذا تبقى 5 ثوانٍ أو أقل."
  },
  {
    id: 3,
    title: "المخاطرة الكبرى",
    desc: "الحصول على الدرجة كاملة (5 نقاط) عند الصواب، مع خصم 3 نقاط عند الخطأ",
    icon: "fa-fire-flame-curved",
    type: "risk",
    scope: "instant",
    applicableTo: "all",
    effect: { fullMarksOnCorrect: 5, penaltyOnWrong: 3 },
    mechanicsText: "مخاطرة ذكية فورية: عند الإجابة الصحيحة يمنح المتسابق الدرجة الكاملة للسؤال (5 نقاط)، وعند الخطأ يخصم 3 نقاط من رصيده مع مراعاة ألا يصبح الرصيد سالباً."
  },
  {
    id: 4,
    title: "درع الأمان",
    desc: "حماية تامة من أي خصم نقاط ناتج عن الخطأ أو انتهاء الوقت في السؤال الحالي",
    icon: "fa-shield-halved",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { immunity: true },
    mechanicsText: "ميزة إيجابية فورية: تحمي المتسابق من أي خصم نقاط بسبب الخطأ أو انتهاء الوقت في السؤال الحالي. لا تمنح نقاطاً مجانية ولا تغير التقييم العلمي، بل تمنع الخصم المحدد فقط."
  },
  {
    id: 5,
    title: "حذف خيارين",
    desc: "استبعاد خيارين خاطئين تلقائياً في أسئلة الاختيار من متعدد",
    icon: "fa-filter",
    type: "buff",
    scope: "instant",
    applicableTo: "mcq",
    effect: { eliminateOptions: 2 },
    mechanicsText: "ميزة إيجابية فورية: مخصصة لأسئلة الاختيار من متعدد؛ يستبعد النظام خيارين خاطئين فقط اعتماداً على مفتاح الإجابة، ليتبقى للمتسابق خياران أحدهما هو الإجابة الصحيحة."
  },
  {
    id: 6,
    title: "استشارة المعلم",
    desc: "إيقاف المؤقت واختيار معلم مؤهل من الحاضرين للتوجيه مع استئناف المؤقت بـ +15 ثانية",
    icon: "fa-chalkboard-user",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { teacherConsultation: true, extraTimeAfterResume: 15 },
    mechanicsText: "ميزة إيجابية فورية بآلية خاصة: يتوقف المؤقت، وتفتح نافذة تعرض المعلمين المتصلين المؤهلين (حتى 10 معلمين أو أكثر)، ويتم اختيار معلم عشوائياً أو يدويّاً لتقديم نصيحة توضيحية. وبعد الانتهاء يستأنف المؤقت من وقته المتبقي السابق مضافاً إليه 15 ثانية."
  },
  {
    id: 7,
    title: "السؤال الذهبي",
    desc: "مضاعفة درجات السؤال الحالي لتصل إلى 10 نقاط كحد أقصى عند الإجابة الصحيحة",
    icon: "fa-coins",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { doublePoints: true, maxPoints: 10 },
    mechanicsText: "ميزة إيجابية فورية: تصبح الدرجة القصوى للسؤال 10 نقاط بدلاً من 5 عند الإجابة الصحيحة المعتمدة، ولا تتغير درجات بقية المتسابقين."
  },
  {
    id: 8,
    title: "تجميد الوقت",
    desc: "إيقاف المؤقت لمدة 10 ثوانٍ للتفكير بهدوء دون استهلاك الوقت المتبقي",
    icon: "fa-snowflake",
    type: "buff",
    scope: "instant",
    applicableTo: "timer",
    effect: { freezeTime: 10 },
    mechanicsText: "ميزة إيجابية فورية: يوقف المؤقت المعتمد لمدة 10 ثوانٍ، ثم يستأنف تلقائياً من الوقت المتبقي السابق دون تصفير العداد أو إعادة السؤال من بدايته."
  },
  {
    id: 9,
    title: "استبدال السؤال",
    desc: "طلب استبدال السؤال الحالي بسؤال بديل من نفس القسم بموافقة المشرف",
    icon: "fa-arrows-rotate",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { swapQuestion: true },
    mechanicsText: "ميزة إيجابية فورية: تسمح للمشرف باستبدال السؤال الحالي بسؤال بديل متقارب من نفس القسم وبثه لجميع الشاشات قبل اعتماد الإجابة أو بدء التقييم النهائي."
  },
  {
    id: 10,
    title: "هدوء وسكينة",
    desc: "إضافة 10 ثوانٍ كاملة إلى الوقت المتبقي للسؤال الحالي فقط",
    icon: "fa-clock",
    type: "buff",
    scope: "instant",
    applicableTo: "timer",
    effect: { timeDelta: 10 },
    mechanicsText: "ميزة إيجابية فورية: يضيف 10 ثوانٍ إلى الوقت المتبقي للسؤال الحالي دون تراكم أو إعادة المؤقت للبداية."
  },
  {
    id: 11,
    title: "نجمة التلاوة",
    desc: "إضافة نقطة واحدة (+1) إلى تقييم السؤال الشفهي المعتمد",
    icon: "fa-star",
    type: "buff",
    scope: "instant",
    applicableTo: "oral",
    effect: { oralBonus: 1, maxPoints: 5 },
    mechanicsText: "ميزة إيجابية فورية لأسئلة التلاوة والشفهي: تضيف نقطة واحدة إلى تقييم السؤال الشفهي المعتمد دون تجاوز الحد الأقصى (5 درجات)، مع تسجيلها منفصلة في السجل."
  },
  {
    id: 12,
    title: "نَفَس عميق",
    desc: "إضافة 3 ثوانٍ إلى الوقت المسموح لكل سؤال حتى ظهور مجموعة البطاقات التالية",
    icon: "fa-wind",
    type: "buff",
    scope: "cycle",
    applicableTo: "timer",
    effect: { timeDeltaPerQuestion: 3 },
    mechanicsText: "تأثير مستمر حتى بداية دورة البطاقات التالية: يضيف 3 ثوانٍ لكل سؤال صالح خلال الدورة الحالية للمتسابق المستفيد."
  },
  {
    id: 13,
    title: "عين الصواب",
    desc: "عرض تلميح تعليمي ذكي (أول حرف أو موضع الحكم) يقود المتسابق نحو الصواب",
    icon: "fa-eye",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { showHint: true },
    mechanicsText: "ميزة إيجابية فورية: تعرض تلميحاً تعليمياً مرتبطاً بالسؤال (كأول حرف أو نوع الحكم) دون كشف الإجابة كاملة."
  },
  {
    id: 14,
    title: "تحدي الأبطال",
    desc: "تقليص الوقت المتبقي إلى النصف مع منح +3 نقاط إضافية عند الإجابة الصحيحة",
    icon: "fa-medal",
    type: "risk",
    scope: "instant",
    applicableTo: "timer",
    effect: { halfTime: true, pointsBonus: 3 },
    mechanicsText: "مخاطرة ذكية فورية: يقلل الوقت المتبقي للنصف، وإذا أجاب المتسابق إجابة صحيحة معتمدة يحصل على 3 نقاط إضافية."
  },
  {
    id: 15,
    title: "فرصة ثانية",
    desc: "منح محاولة ثانية فورية على السؤال نفسه عند اعتماد إجابة غير صحيحة",
    icon: "fa-arrow-rotate-left",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { secondChance: true },
    mechanicsText: "ميزة إيجابية فورية: عند الخطأ الأول، يمنح المتسابق محاولة ثانية دون تسجيل خطأ نهائي أو خصم، وتعتمد النتيجة بعد المحاولة الثانية."
  },
  {
    id: 16,
    title: "بركة الإتقان",
    desc: "التسامح مع خطأ تجويدي بسيط واحد في التقييم الشفهي ومنع الخصم بسببه",
    icon: "fa-hand-holding-heart",
    type: "buff",
    scope: "instant",
    applicableTo: "oral",
    effect: { forgiveMinorOralFault: true },
    mechanicsText: "ميزة إيجابية فورية للسؤال الشفهي: تسمح بالتسامح مع خطأ تجويدي بسيط واحد وتمنع الخصم المرتبط به مع تسجيل الخطأ في السجل."
  },
  {
    id: 17,
    title: "حصانة الترتيب",
    desc: "تثبيت أول عنصرين في موضعهما الصحيح تلقائياً في أسئلة الترتيب",
    icon: "fa-lock",
    type: "buff",
    scope: "instant",
    applicableTo: "ordering",
    effect: { lockOrderingItems: 2 },
    mechanicsText: "ميزة إيجابية فورية مخصصة لأسئلة الترتيب: يثبت النظام أول عنصرين في موضعهما الصحيح وفق مفتاح الإجابة لتيسير إكمال الترتيب."
  },
  {
    id: 18,
    title: "توصيل الحكمة",
    desc: "توصيل زوجين صحيحين من العناصر تلقائياً في أسئلة المطابقة والتوصيل",
    icon: "fa-link",
    type: "buff",
    scope: "instant",
    applicableTo: "matching",
    effect: { autoMatchPairs: 2 },
    mechanicsText: "ميزة إيجابية فورية مخصصة لأسئلة المطابقة: يربط زوجين صحيحين تلقائياً وفق مفتاح الإجابة، وتُحتسب الدرجات بعد إكمال بقية الأزواج."
  },
  {
    id: 19,
    title: "نور البيان",
    desc: "عرض وتوضيح القاعدة التجويدية أو الإملائية المرتبطة بالسؤال",
    icon: "fa-book-quran",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { showRuleInfo: true },
    mechanicsText: "ميزة إيجابية فورية: تعرض القاعدة أو الحكم التجويدي المرتبط بالسؤال من بيانات السؤال المعتمدة لإعانة الطالب على التطبيق السليم."
  },
  {
    id: 20,
    title: "مكافأة الثبات",
    desc: "منح نقطة إضافية عن كل إجابة صحيحة متتالية خلال دورة البطاقات الحالية",
    icon: "fa-chart-line",
    type: "buff",
    scope: "cycle",
    applicableTo: "all",
    effect: { comboStreakBonus: 1 },
    mechanicsText: "تأثير مستمر حتى بداية دورة البطاقات التالية: يمنح نقطة إضافية عن كل إجابة صحيحة متتالية خلال الدورة، ويصفر عداد التتابع عند الخطأ، مع بقاء النقاط المعتمدة بعد انتهاء الدورة."
  },
  {
    id: 21,
    title: "سهم الانطلاق والتخطي",
    desc: "تخطي السؤال الحالي بأمان تام دون عقوبة مع الحصول على 3 نقاط إضافية",
    icon: "fa-forward-fast",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { skipCurrentQuestion: true, grantPoints: 3 },
    mechanicsText: "ميزة إيجابية فورية: تسمح بتجاوز السؤال الحالي دون عقوبة، وتمنح 3 نقاط تكتيكية للمتسابق بعد اعتماد التخطي."
  },
  {
    id: 22,
    title: "درع التقييم",
    desc: "حماية التقييم الشفهي من الخصم بحيث لا يقل عن 4 درجات في السؤال الشفهي",
    icon: "fa-shield",
    type: "buff",
    scope: "instant",
    applicableTo: "oral",
    effect: { minOralRating: 4 },
    mechanicsText: "ميزة إيجابية فورية للسؤال الشفهي: تمنع الخصومات الناتجة عن الأخطاء البسيطة بحيث لا يقل تقييم السؤال عن 4 درجات من 5."
  },
  {
    id: 23,
    title: "صوت الواثق",
    desc: "إلغاء التوقيت وضغط المؤقت تماماً في السؤال الشفهي والتلاوة براحة وهدوء",
    icon: "fa-microphone",
    type: "buff",
    scope: "instant",
    applicableTo: "oral",
    effect: { noTimeLimitOral: true },
    mechanicsText: "ميزة إيجابية فورية للسؤال الشفهي: تزيل الضغط الزمني عن المتسابق في السؤال الشفهي المحدد ليقرأ بارتياح تام دون تسرع."
  },
  {
    id: 24,
    title: "إعادة ترتيب الأوراق",
    desc: "إتاحة إعادة ترتيب الأسئلة القادمة في القسم الحالي بموافقة المشرف",
    icon: "fa-shuffle",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { reorderRemainingQuestions: true },
    mechanicsText: "ميزة إيجابية فورية للمشرف: تتيح إعادة ترتيب الأسئلة التي لم يبدأ عرضها بعد في القسم وبث الترتيب الجديد لجميع الشاشات."
  },
  {
    id: 25,
    title: "قلب الموازين",
    desc: "تحويل السؤال الحالي أو القادم إلى سؤال مكافأة قيمته 7 نقاط كحد أقصى بدلاً من 5",
    icon: "fa-gem",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { bonusCapPoints: 7 },
    mechanicsText: "ميزة إيجابية فورية: تحول السؤال إلى سؤال مكافأة قيمته 7 نقاط كحد أقصى بدلاً من 5 عند الإجابة الصحيحة المعتمدة."
  },
  {
    id: 26,
    title: "التأني والسلامة",
    desc: "إضافة 15 ثانية كاملة إلى الوقت المسموح للسؤال الحالي",
    icon: "fa-clock-rotate-left",
    type: "buff",
    scope: "instant",
    applicableTo: "timer",
    effect: { timeDelta: 15 },
    mechanicsText: "ميزة إيجابية فورية: تضيف 15 ثانية إلى رصيد وقت السؤال الحالي لتوفير مهلة تأنٍّ وتدبّر كافية."
  },
  {
    id: 27,
    title: "عين الحافظ",
    desc: "عرض سياق الآية الكريمة (الآية السابقة واللاحقة) لمساعدة المتسابق في استحضار النص",
    icon: "fa-compass",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { showVerseContext: true },
    mechanicsText: "ميزة إيجابية فورية: تعرض سياق الآية السابقة واللاحقة للآية المستهدفة استناداً لبيانات قرآنية موثوقة لمساعدة المتسابق في الاستحضار."
  },
  {
    id: 28,
    title: "مضاعف الشرف",
    desc: "منح 5 نقاط شرف إضافية تضاف للوحة الشرف المركزية عند الإجابة الصحيحة",
    icon: "fa-arrow-up-right-dots",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { honorPointsBonus: 5 },
    mechanicsText: "ميزة إيجابية فورية: تمنح 5 نقاط شرف إضافية في لوحة الشرف التراكمية عند الإجابة الصحيحة وتُحدّث اللوحة المركزية فوراً."
  },
  {
    id: 29,
    title: "اختيار وتخطي السؤال",
    desc: "استعراض قائمة الأسئلة القادمة المتبقية وتحديد سؤال لتخطيه مسبقاً ونيل 3 نقاط",
    icon: "fa-list-check",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { preSkipUpcomingQuestion: true, grantPoints: 3 },
    mechanicsText: "ميزة إيجابية فورية مسبقة: تتيح للمتسابق تحديد سؤال لاحق لم يُعرض بعد لتخطيه مسبقاً ونيل 3 نقاط إضافية عند الوصول إليه."
  },
  {
    id: 30,
    title: "حزام الأمان التجويدي",
    desc: "التسامح في خطأ واحد في أحكام الغنة أو المد دون إنقاص درجة التلاوة",
    icon: "fa-circle-check",
    type: "buff",
    scope: "instant",
    applicableTo: "oral",
    effect: { forgiveMaddGhunnahFault: true },
    mechanicsText: "ميزة إيجابية فورية للسؤال الشفهي: تسمح بالتسامح مع خطأ واحد محدد في أحكام المد أو الغنة دون إنقاص درجة السؤال."
  },
  {
    id: 31,
    title: "الإيقاع السريع",
    desc: "منح 3 نقاط إضافية إذا اعتُمدت الإجابة الصحيحة في أقل من 5 ثوانٍ",
    icon: "fa-forward-fast",
    type: "risk",
    scope: "instant",
    applicableTo: "timer",
    effect: { speedBonusUnder5s: 3 },
    mechanicsText: "مخاطرة ذكية فورية: يمنح 3 نقاط إضافية إذا تم تقديم الإجابة الصحيحة واعتمادها في أقل من 5 ثوانٍ من بداية السؤال المركزية."
  },
  {
    id: 32,
    title: "نور الصدر",
    desc: "إبراز علامات الضبط والتشكيل والمخارج الملونة في الكلمة القرآنية للسؤال",
    icon: "fa-highlighter",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { coloredQuranHarakat: true },
    mechanicsText: "ميزة إيجابية فورية: تبرز علامات الضبط والتشكيل والألوان التوضيحية للأحكام في النص القرآني المعروض دون المساس بأصل النص."
  },
  {
    id: 33,
    title: "مساعدة الزميل",
    desc: "اختيار معلم مؤهل من الغرفة لتقديم تنبيه إيجابي سريع مع استمرار المؤقت",
    icon: "fa-user-group",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { peerTeacherTip: true },
    mechanicsText: "ميزة إيجابية فورية: تتيح اختيار معلم مؤهل من الغرفة لتقديم تنبيه قصير مع استمرار المؤقت (تختلف عن استشارة المعلم بأنها لا توقف المؤقت ولا تضيف 15 ثانية)."
  },
  {
    id: 34,
    title: "طاقة العزيمة",
    desc: "إعادة ضبط مؤقت السؤال إلى مدته الأصلية بالكامل إذا تبقى 5 ثوانٍ أو أقل",
    icon: "fa-battery-full",
    type: "buff",
    scope: "instant",
    applicableTo: "timer",
    effect: { resetTimerIfLow: true, thresholdSeconds: 5 },
    mechanicsText: "ميزة إيجابية فورية: تعيد ضبط المؤقت إلى مدته الأصلية المحددة للسؤال إذا كان الوقت المتبقي 5 ثوانٍ أو أقل قبل نفاد الوقت."
  },
  {
    id: 35,
    title: "وسام الشرف القرآني",
    desc: "منح نقطة شرف دائمة تُضاف للمجموع التراكمي النهائي للمتسابق في لوحة الشرف",
    icon: "fa-award",
    type: "buff",
    scope: "permanent",
    applicableTo: "all",
    effect: { permanentHonorPoint: 1 },
    mechanicsText: "مكافأة دائمة تُعتمد مرة واحدة: تمنح نقطة شرف واحدة تُسجل في رصيد الشرف الدائم للمتسابق ولا تُحذف بانتهاء الدورة."
  },
  {
    id: 36,
    title: "توازن الحكماء",
    desc: "تقسيم درجات السؤال بالتساوي (2.5 نقطة للدقة + 2.5 نقطة لسرعة الإجابة)",
    icon: "fa-scale-balanced",
    type: "buff",
    scope: "instant",
    applicableTo: "timer",
    effect: { balanceAccuracyAndSpeed: true },
    mechanicsText: "ميزة إيجابية فورية: تقسم درجة السؤال بالتساوي: 2.5 درجة للدقة وصحة الإجابة، و2.5 درجة للسرعة بحسب نسبة الوقت المتبقي."
  },
  {
    id: 37,
    title: "صمام الأمان النهائي",
    desc: "تسجيل أعلى مجموع نقاط وصل إليه المتسابق وضمان عدم هبوط النتيجة النهائية عنه",
    icon: "fa-vault",
    type: "buff",
    scope: "match",
    applicableTo: "all",
    effect: { lockHighestScoreUntilEnd: true },
    mechanicsText: "حماية مستمرة حتى نهاية المسابقة الحالية: يسجل النظام أعلى مجموع نقاط وصل إليه المتسابق، وفي نهاية المسابقة تضمن النتيجة ألا تقل عن هذا المجموع حتى لو تعرض لخصومات لاحقة."
  },
  {
    id: 38,
    title: "الخط العثماني الميسر",
    desc: "تكبير حجم الخط القرآني بنسبة 150% مع إضاءة خلفية واضحة حتى الدورة القادمة",
    icon: "fa-magnifying-glass-plus",
    type: "buff",
    scope: "cycle",
    applicableTo: "all",
    effect: { zoomQuranScript: 1.5 },
    mechanicsText: "تأثير مستمر حتى ظهور مجموعة البطاقات التالية: يزيد حجم الخط القرآني المعروض بنسبة 150% مع إضاءة واضحة ومريحة للقراءة حتى بداية الدورة التالية."
  },
  {
    id: 39,
    title: "السؤال المشترك",
    desc: "فتح تشاور بين المشرف والمعلمين لتحديد وتكييف جزء السؤال الأكثر ملاءمة للطالب",
    icon: "fa-people-arrows",
    type: "buff",
    scope: "instant",
    applicableTo: "all",
    effect: { jointTeacherSupervisorReview: true },
    mechanicsText: "ميزة إيجابية فورية: تفتح نافذة للمشرف والمعلمين لمراجعة مستوى السؤال أو تحديد الجزء المطلوب تقييم الطالب فيه بما يتناسب مع مستواه بعد اعتماد المشرف."
  },
  {
    id: 40,
    title: "ختام المسك",
    desc: "جعل آخر سؤال صالح في المسابقة يستحق 5 نقاط كاملة كحد أقصى تقديراً للاجتهاد",
    icon: "fa-crown",
    type: "buff",
    scope: "instant",
    applicableTo: "final",
    effect: { finaleBonusCap: 5 },
    mechanicsText: "ميزة إيجابية فورية لآخر سؤال صالح في المسابقة: تجعل السؤال الأخير يستحق 5 نقاط كاملة كحد أقصى وفق التصحيح المعتمد تقديراً لختام المسابقة."
  }
];

/**
 * الحصول على بطاقة عبر معرفها
 */
export function getCardById(cardId) {
  if (cardId === null || cardId === undefined) return null;
  return TACTICAL_CARDS.find(c => String(c.id) === String(cardId)) || null;
}

/**
 * فحص توافق البطاقة مع السؤال الحالي وحالة المسابقة
 */
export function isCardCompatible(card, question, context = {}) {
  if (!card) return false;
  const app = card.applicableTo || "all";
  const qType = question?.type || "";

  if (app === "mcq" && qType !== "mcq") return false;
  if (app === "oral" && qType !== "oral") return false;
  if (app === "matching" && qType !== "matching") return false;
  if (app === "ordering" && qType !== "ordering") return false;

  // فحص بطاقات المؤقت
  if (app === "timer") {
    const isTimerOff = context.noTimeLimit || context.questionTimer === 0;
    if (isTimerOff) return false;
    // بطاقة 2: سرعة وإتقان تتطلب وقتاً كافياً
    if (card.id === 2 && typeof context.remainingSeconds === "number" && context.remainingSeconds <= 5) {
      return false;
    }
    // بطاقة 34: طاقة العزيمة تتطلب أن يكون الوقت 5 ثوانٍ أو أقل
    if (card.id === 34 && typeof context.remainingSeconds === "number" && context.remainingSeconds > 5) {
      return false;
    }
  }

  // بطاقة 40: ختام المسك مخصصة لآخر سؤال
  if (app === "final" || card.id === 40) {
    if (typeof context.currentQuestionIdx === "number" && typeof context.totalQuestions === "number") {
      const isLast = (context.currentQuestionIdx >= context.totalQuestions - 1);
      if (!isLast) return false;
    }
  }

  return true;
}

/**
 * بيان سبب عدم توافق البطاقة بلغة عربية واضحة
 */
export function getIncompatibilityReason(card, question, context = {}) {
  if (!card) return "البطاقة غير معروفة.";
  const app = card.applicableTo || "all";
  const qType = question?.type || "";

  if (app === "mcq" && qType !== "mcq") {
    return "هذه البطاقة مخصصة لأسئلة الاختيار من متعدد فقط.";
  }
  if (app === "oral" && qType !== "oral") {
    return "هذه البطاقة مخصصة لأسئلة التلاوة والتقييم الشفهي فقط.";
  }
  if (app === "matching" && qType !== "matching") {
    return "هذه البطاقة مخصصة لأسئلة التوصيل والمطابقة فقط.";
  }
  if (app === "ordering" && qType !== "ordering") {
    return "هذه البطاقة مخصصة لأسئلة الترتيب وتكوين الآيات فقط.";
  }
  if (app === "timer" && (context.noTimeLimit || context.questionTimer === 0)) {
    return "هذا السؤال لا يستخدم مؤقتاً زمنياً.";
  }
  if (card.id === 2 && typeof context.remainingSeconds === "number" && context.remainingSeconds <= 5) {
    return "لا يتبقى وقت كافٍ لتخفيض 5 ثوانٍ من المؤقت.";
  }
  if (card.id === 34 && typeof context.remainingSeconds === "number" && context.remainingSeconds > 5) {
    return "بطاقة طاقة العزيمة تُفعّل فقط عند تبقي 5 ثوانٍ أو أقل في العداد.";
  }
  if ((app === "final" || card.id === 40) && typeof context.currentQuestionIdx === "number" && typeof context.totalQuestions === "number") {
    if (context.currentQuestionIdx < context.totalQuestions - 1) {
      return "بطاقة «ختام المسك» مخصصة لآخر سؤال في المسابقة فقط.";
    }
  }

  return "البطاقة غير متوافقة مع هذا السؤال حالياً.";
}

/**
 * نص نوع ونطاق سريان البطاقة
 */
export function formatCardScopeLabel(scope) {
  switch (scope) {
    case "instant":
      return "فورية لسؤال واحد";
    case "cycle":
      return "مستمرة حتى الدورة التالية";
    case "permanent":
      return "مكافأة دائمة";
    case "match":
      return "مستمرة حتى نهاية المسابقة";
    default:
      return "فورية";
  }
}

/**
 * شرح آلية عمل البطاقة
 */
export function getCardMechanicsExplanation(card) {
  if (!card) return "";
  return card.mechanicsText || card.desc;
}

/**
 * اختيار عدد معين من البطاقات عشوائياً (الافتراضي 3)
 */
export function getRandomTacticalCards(count = 3) {
  const shuffled = [...TACTICAL_CARDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
