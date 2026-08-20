const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType
} = require('docx');

const categories = [
  {
    catNum: 1,
    title: "المحور الأول: الذكاء الاصطناعي والأتمتة السريرية والصيدلانية (Clinical & Pharmacy AI)",
    color: "0F766E",
    ideas: [
      { num: 1, title: "فاحص التداخلات الدوائية التفاعلي اللحظي (Drug-Drug Interactions Analyzer)", desc: "تحذير فوري ومرئي عند إضافة صنفين متعارضين في فاتورة واحدة مع توثيق المرجع البريطاني الرسمي BNF 83.", priority: "عالية جداً 🔥", tech: "Next.js Modal + BNF 83 Engine" },
      { num: 2, title: "حاسبة جرعات الأطفال التلقائية بالوزن والعمر (Pediatric Dosing Calculator)", desc: "حساب جرعات المضادات الحيوية وخوافض الحرارة بالسنتيمتر مكعب / مل بدقة لمنع الأخطاء العلاجية.", priority: "عالية جداً 🔥", tech: "Custom Calculation Engine + BNF Dosing" },
      { num: 3, title: "المساعد الصيدلاني الصوتي للبحث عن البدائل (Voice AI Pharmacy Assistant)", desc: "البحث الصوتي الذكي عن بدائل الأدوية بنفس المادة الفعالة والتركيز ومقارنة الأسعار بـ (د.ل).", priority: "متوسطة ⚡", tech: "Web Speech API + Semantic DB Search" },
      { num: 4, title: "قارئ الروشتات الطبية بالرؤية الحاسوبية (Prescription OCR & Vision AI)", desc: "تصوير الروشتة المكتوبة بخط الطبيب اليدوي واستخراج الأصناف وإضافتها لسلة المشتريات تلقائياً.", priority: "مستقبلية 🚀", tech: "Gemini Vision / Cloud Vision OCR" },
      { num: 5, title: "فاحص مأمونية الأدوية للحوامل والمرضعات (Pregnancy & Lactation Safety Guard)", desc: "إظهار تصنيف خطورة الدواء للحوامل والمرضعات بدقة مع اقتراح البدائل الأكثر أماناً وموثوقية.", priority: "عالية جداً 🔥", tech: "PostgreSQL Drug Tags + BNF Knowledge" },
      { num: 6, title: "حاسبة التعديل الكلوي لجرعات المضادات (Renal Clearance Dosage Adjuster)", desc: "حساب معدل تصفية الكرياتينين (CrCl/GFR) وتعديل جرعة الدواء تلقائياً لمرضى الفشل الكلوي.", priority: "متوسطة ⚡", tech: "Cockcroft-Gault Algorithm Component" },
      { num: 7, title: "منشئ خطط العلاج المزمن والتذكير الدوري (Chronic Medication Auto-Refill)", desc: "متابعة مرضى السكري والضغط وإرسال تنبيه واتساب آلي لتجديد الدواء قبل نفاده بـ 3 أيام.", priority: "عالية جداً 🔥", tech: "PostgreSQL Cron + n8n WhatsApp Flow" },
      { num: 8, title: "التعرف على الأدوية بالصورة من شكل الحبة والعبوة (Pill & Pack Recognition)", desc: "التعرف على الصنف وتاريخ صلاحيته عبر التقاط صورة لشريط الدواء أو العلبة من كاميرا الهاتف.", priority: "مستقبلية 🚀", tech: "Mobile Camera Stream + Image Embedding" },
      { num: 9, title: "نظام توثيق وحساب التركيبات الصيدلانية (Compounding Master Formulation)", desc: "حساب نسب المواد الخام والتكلفة وتوليد ملصق الجرعة والتشغيلة للتركيبات الجلدية والطبية.", priority: "متوسطة ⚡", tech: "Formula Builder Module + Label Printer" },
      { num: 10, title: "كاشف التشابه الإملائي والصوتي للأدوية (LASA - Look-Alike Sound-Alike Alert)", desc: "تنبيه الصيدلي عند اختيار دواء يتشابه اسمه الصوتي أو الإملائي مع دواء آخر خطير لمنع الخطأ.", priority: "عالية جداً 🔥", tech: "Levenshtein Distance Algorithm" }
    ]
  },
  {
    catNum: 2,
    title: "المحور الثاني: القياسات الحيوية وإثبات الحضور المتقدم (Biometrics & AI Geofencing)",
    color: "1E40AF",
    ideas: [
      { num: 11, title: "التحقق من الوجه بالذكاء الاصطناعي مع كشف الحيوية (AI Face Liveness Verification)", desc: "التقاط صورة سريعة عند الدخول والتأكد من وجود الموظف الحقيقي لمنع تسجيل الزميل لزميله.", priority: "عالية جداً 🔥", tech: "MediaPipe FaceMesh / Face-api.js" },
      { num: 12, title: "النطاق الجغرافي الذكي متعدد الفروع والمقرات (Multi-Location Smart Geofencing)", desc: "تحديد عدة مقرات وفروع للنشاط مع انتقال الموظف المتنقل بينها وتوثيق مكان الحضور تلقائياً.", priority: "عالية جداً 🔥", tech: "Haversine Distance Multi-Polygon Matrix" },
      { num: 13, title: "الحضور عبر شبكة الواي فاي المعتمدة (Office Wi-Fi BSSID Handshake)", desc: "مطابقة معرّف شبكة الواي فاي للفرع للتأكد بنسبة 100% من تواجد الهاتف داخل المنشأة حصراً.", priority: "متوسطة ⚡", tech: "Captive Portal Handshake / Network API" },
      { num: 14, title: "الحضور اللاتلامسي عبر ملصقات NFC الذكية (NFC Mobile Tap Check-In)", desc: "تسجيل الحضور بلمس هاتف الموظف لملصق NFC مشفر ومثبت على باب الفرع أو الاستقبال.", priority: "متوسطة ⚡", tech: "Web NFC API + Rotating Cryptographic Token" },
      { num: 15, title: "رمز الاستجابة السريعة المتغير لحظياً (Dynamic Rotating QR Kiosk)", desc: "شاشة لوحية في المدخل تعرض رمز QR يتغير كل 10 ثوانٍ يمسحه الموظف بهاتفه لإثبات التواجد.", priority: "عالية جداً 🔥", tech: "WebSocket / Server-Sent Events (SSE)" },
      { num: 16, title: "حظر برامج تزييف الموقع والـ GPS الوهمي (Anti-Spoofing & Mock Location Guard)", desc: "كشف ومنع محاولات تزييف الموقع الجغرافي وتنبيه الإدارة فوراً بمحاولة التحايل والتلاعب.", priority: "عالية جداً 🔥", tech: "Navigator Geolocation Accuracy Validator" },
      { num: 17, title: "تسجيل الحضور الجماعي لشفتات الفرق والورش (Team Lead Group Check-In)", desc: "تمكين رئيس الفريق أو المشرف من تسجيل حضور مجموعته كاملة بضغطة زر واحدة موثقة.", priority: "متوسطة ⚡", tech: "Batch Attendance API Endpoint" },
      { num: 18, title: "الحضور التلقائي الذكي عبر البلوتوث منخفض الطاقة (BLE Beacon Proximity)", desc: "تسجيل الدخول تلقائياً بمجرد دخول الموظف نطاق جهاز البلوتوث (Beacon) في المقر.", priority: "مستقبلية 🚀", tech: "Web Bluetooth API / Mobile PWA Worker" },
      { num: 19, title: "التحقق الصوتي من بصمة صوت الموظف (Voice Biometrics Authentication)", desc: "نطق الموظف لكود عشوائي للتحقق من بصمة صوته ونبرته عند تسجيل الحضور عن بُعد.", priority: "مستقبلية 🚀", tech: "Audio Context Waveform Matcher" },
      { num: 20, title: "رسم مسار الزيارات الميدانية على الخريطة (Field Breadcrumb GPS Route)", desc: "رسم خريطة مسار تحركات الفني الميداني ومواقع الزيارات ومطابقتها مع ساعات دوامه.", priority: "عالية جداً 🔥", tech: "Leaflet Map Path Tracking + Polyline View" }
    ]
  },
  {
    catNum: 3,
    title: "المحور الثالث: إدارة الشفتات المعقدة وحسابات الرواتب (Smart Shifts & Payroll)",
    color: "047857",
    ideas: [
      { num: 21, title: "حاسبة الرواتب والبدلات الشاملة بنقرة واحدة (One-Click Automated Payroll Run)", desc: "توليد كشوفات الرواتب الشاملة للبدلات، المكافآت، السلف، وساعات العمل الفعلي بـ (د.ل) وتصديرها.", priority: "عالية جداً 🔥", tech: "Dual Salary Engine + PDF Export Lib" },
      { num: 22, title: "سوق تبادل الشفتات بين الموظفين (Shift Swap Marketplace & Approvals)", desc: "تمكين الموظف من طلب تبادل ورديته مع زميل، مع وصول إشعار فوري للمدير للموافقة.", priority: "عالية جداً 🔥", tech: "Shift Request Workflow + WhatsApp Action" },
      { num: 23, title: "الجدولة الذكية للورديات وسد العجز بالـ AI (Auto-Rostering & Coverage AI)", desc: "توزيع الشفتات تلقائياً بناءً على كفاءة الموظفين، التخصصات، والحد الأدنى للكوادر بكل قسم.", priority: "متوسطة ⚡", tech: "Constraint Satisfaction Scheduling Engine" },
      { num: 24, title: "حساب عمولات المبيعات ونسب الإنتاجية (Sales Commission & Incentive Matrix)", desc: "حساب نسبة العمولة لكل صيدلي أو فني بناءً على إنجازاته ومبيعاته وربطها بالراتب الشهري.", priority: "عالية جداً 🔥", tech: "Sales Target DB + Commission Matrix" },
      { num: 25, title: "نظام طلب ومتابعة السلف والعهد المالية (Advance Salary & Petty Cash)", desc: "تقديم طلب سلفة من الهاتف وخصمها المجدول تلقائياً من راتب الشهر المستحق ومتابعة الرصيد.", priority: "عالية جداً 🔥", tech: "Loan Management Sub-Schema + Ledger" },
      { num: 26, title: "رصيد الإجازات السنوية والمرضية وسجل الغياب (Vacation Balance & Leave Flow)", desc: "احتساب رصيد الإجازات المستحقة تلقائياً مع رفع التقارير الطبية والموافقات الإلكترونية.", priority: "عالية جداً 🔥", tech: "Leave Accrual System + Document Upload" },
      { num: 27, title: "حساب ساعات العمل الإضافي التلقائي (Tiered Overtime Multiplier Engine)", desc: "احتساب ساعات ما بعد الدوام بمعدل 1.5x أو 2.0x في العطلات الرسمية وأيام الجمعة تلقائياً.", priority: "عالية جداً 🔥", tech: "Rate Rules Engine Multiplier Integration" },
      { num: 28, title: "محفظة الموظف الرقمية وكشف الحساب التفاعلي (Employee Digital Payslip Wallet)", desc: "واجهة هاتف للموظف تعرض تفاصيل أرباحه، ساعاته، سلفه، وصافي مستحقاته بشفافية كاملة.", priority: "عالية جداً 🔥", tech: "Next.js Mobile-Optimized Dashboard Tab" },
      { num: 29, title: "نظام التقييم الدوري وتأثيره على سلم المكافآت (KPI Appraisal & Bonus System)", desc: "تقييم أداء شهري للموظف من قبل مديره يؤثر على نسبة الحوافز السنوية والمكافآت الدورية.", priority: "متوسطة ⚡", tech: "Scoring Matrix + Performance Analytics" },
      { num: 30, title: "تنبيهات تجاوز الحد الأقصى لساعات الدوام (Labor Fatigue & Burnout Guard)", desc: "تنبيه الإدارة عند اقتراب الموظف من إجهاد العمل لتجنب الأخطاء الطبية وحوادث العمل.", priority: "متوسطة ⚡", tech: "Weekly Hours Aggregator & Alert Trigger" }
    ]
  },
  {
    catNum: 4,
    title: "المحور الرابع: العمليات الميدانية وتذاكر الصيانة (Field Service & Operations)",
    color: "B45309",
    ideas: [
      { num: 31, title: "توقيع العميل الإلكتروني الموثق بـ OTP و GPS (Cryptographic Client e-Signature)", desc: "توقيع العميل على شاشة الهاتف مع رمز تحقق OTP وموقع الزيارة الجغرافي وإصدار إيصال معتمد.", priority: "عالية جداً 🔥", tech: "HTML5 Canvas + SHA-256 Hash + WhatsApp OTP" },
      { num: 32, title: "توثيق صور الصيانة قبل وبعد الإنجاز (Before & After Photo Proof)", desc: "إلزام الفني بالتقاط صور المعدة قبل الصيانة وبعدها وحفظها في تقرير الزيارة الفني.", priority: "عالية جداً 🔥", tech: "Direct Image Upload + Cloudinary / Local Store" },
      { num: 33, title: "تسعير قطع الغيار الميدانية وسحبها من المخزن فوراً (Field Parts Deduction)", desc: "اختيار قطع الغيار المستخدمة أثناء الزيارة وخصمها من المستودع وإضافتها للفاتورة مباشرة.", priority: "عالية جداً 🔥", tech: "Inventory Linkage + Realtime Stock Sync" },
      { num: 34, title: "إرسال رابط تتبع الفني على الخريطة للعميل (Technician Live Tracking Link)", desc: "رابط يصل للعميل على واتساب يوضح تحرك الفني وموعد وصوله التقديري لموقع العمل.", priority: "متوسطة ⚡", tech: "Live Geolocation Stream + Public Token" },
      { num: 35, title: "تقييم العميل الفوري للخدمة بالنجوم والتعليق (Post-Visit Star Rating Survey)", desc: "رسالة واتساب تلقائية للعميل فور اكتمال الزيارة لتقييم أداء الفني وجودة الخدمة وجمع الملاحظات.", priority: "عالية جداً 🔥", tech: "WhatsApp Webhook Handler + CSAT Analytics" },
      { num: 36, title: "عقود الصيانة الدورية المجدولة تلقائياً (Recurring Maintenance Contracts - SLA)", desc: "توليد زيارات صيانة دورية كل شهر أو 3 أشهر وإسنادها للمهندسين تلقائياً ومتابعة الالتزام.", priority: "عالية جداً 🔥", tech: "SLA Cron Dispatcher + Contract Model" },
      { num: 37, title: "توجيه الفنيين عبر خرائط جوجل بأقصر مسار (Smart Multi-Stop Route Optimizer)", desc: "ترتيب زيارات اليوم للفنيين جغرافياً لتقليل استهلاك الوقود وزمن الوصول للعملاء.", priority: "متوسطة ⚡", tech: "Google Maps / OSRM Routing Algorithm" },
      { num: 38, title: "الوضع غير المتصل بالإنترنت للزيارات الميدانية (Offline-First PWA Mode)", desc: "إتمام الزيارات في الأماكن ضعيفة التغطية وحفظ التوقيع ومزامنته فور عودة الاتصال.", priority: "عالية جداً 🔥", tech: "IndexedDB Storage + Background Sync Worker" },
      { num: 39, title: "إصدار إيصال سداد وبوليصة ضريبية فورية (Instant Thermal Bluetooth Receipt)", desc: "طباعة الفاتورة والإيصال مباشرة عبر طابعات البلوتوث المحمولة لدى الفني في موقع العميل.", priority: "متوسطة ⚡", tech: "Web Bluetooth ESC/POS Printer Commands" },
      { num: 40, title: "نظام الضمان وإعادة فتح الزيارة المجانية (Warranty Tracking & Free Recall)", desc: "تتبع فترة ضمان الصيانة وربط الزيارة بالسابقة مجاناً إذا تكررت نفس المشكلة خلال فترة الضمان.", priority: "عالية جداً 🔥", tech: "Warranty Expiry Logic + Free Callback Ticket" }
    ]
  },
  {
    catNum: 5,
    title: "المحور الخامس: أتمتة واتساب والبوتات التفاعلية (WhatsApp Intelligence & WAHA)",
    color: "15803D",
    ideas: [
      { num: 41, title: "بوت الحضور السريع عبر واتساب (WhatsApp One-Touch Attendance Bot)", desc: "إرسال الموظف لموقعه الحي (Live Location) على واتساب لتسجيل حضوره أو انصرافه فوراً.", priority: "عالية جداً 🔥", tech: "WAHA Location Message Parser + Geofence API" },
      { num: 42, title: "بوت استعلام العملاء عن توفر الأدوية والأسعار (Medicine Availability Bot)", desc: "يرسل العميل اسم الدواء أو الباركود ويرد البوت بالسعر والتوفر والبدائل الصيدلانية فوراً.", priority: "عالية جداً 🔥", tech: "Inbound WhatsApp Webhook + Fuzzy DB Search" },
      { num: 43, title: "إشعارات وصول النواقص للمرضى المسجلين (Shortage Restock Alert Broadcast)", desc: "إشعار واتساب تلقائي للمريض فور توفير الدواء الذي سبق وسأل عنه ولم يكن متوفراً بالصيدلية.", priority: "عالية جداً 🔥", tech: "Customer Waitlist Schema + Restock Trigger" },
      { num: 44, title: "التقرير المالي الصوتي اليومي للمدير (Daily Audio Executive Voice Digest)", desc: "إرسال رسالة صوتية ذكية للمدير على واتساب بملخص المبيعات والحضور بصوت عربي فخم.", priority: "متوسطة ⚡", tech: "ElevenLabs / OpenAI TTS + n8n WhatsApp Media" },
      { num: 45, title: "بوت استلام طلبات وتوصيل الصيدلية (WhatsApp Pharmacy Order & Delivery Bot)", desc: "استلام صورة الروشتة وتأكيد العنوان وإرسال رابط الدفع وتنبيه سائق التوصيل تلقائياً.", priority: "عالية جداً 🔥", tech: "Multi-Step WhatsApp State Machine" },
      { num: 46, title: "أزرار تفاعلية للموافقة على الإجازات (WhatsApp Interactive Approval Buttons)", desc: "وصول طلب الإجازة للمدير بأزرار تفاعلية [موافقة] أو [رفض] مباشرة من داخل تطبيق واتساب.", priority: "عالية جداً 🔥", tech: "WAHA Interactive Action Buttons Handler" },
      { num: 47, title: "تنبيهات انقطاع درجات حرارة ثلاجة الأدوية (IoT Vaccine Fridge Alarm)", desc: "رسالة واتساب طارئة للمدير إذا تغيرت درجة حرارة ثلاجة الأنسولين واللقاحات عن النطاق الآمن.", priority: "متوسطة ⚡", tech: "ESP32 / MQTT Webhook + WhatsApp Urgent Alert" },
      { num: 48, title: "برودكاست العروض الطبية والتوعوية المخصصة (Targeted Broadcast Campaigns)", desc: "إرسال رسائل توعوية وعروض للأمهات ومرضى السكري والعملاء المميزين برابط النشاط المخصص.", priority: "عالية جداً 🔥", tech: "Broadcast Audience Segmenter + Tenant Url" },
      { num: 49, title: "روبوت تدريب وتطوير الموظفين اليومي (Daily 1-Minute Quiz Bot)", desc: "إرسال سؤال صيدلاني أو تقني يومياً للموظفين لتطوير مهاراتهم وتتويج الفائزين أسبوعياً.", priority: "متوسطة ⚡", tech: "Micro-learning Question Bank + Scoreboard" },
      { num: 50, title: "إشعارات نفاد المخزون اللحظية للموردين (Automated Supplier Stock Alerts)", desc: "توليد وإرسال أمر شراء PDF لمندوب المورد على واتساب فور وصول رصيد الصنف للحد الأدنى.", priority: "عالية جداً 🔥", tech: "PDF Engine Stream + WAHA Document Dispatch" }
    ]
  },
  {
    catNum: 6,
    title: "المحور السادس: سلاسل الإمداد والمخزون الذكي (Supply Chain & Smart Inventory)",
    color: "4338CA",
    ideas: [
      { num: 51, title: "التنبؤ الذكي بالطلب ومعدل الاستهلاك (AI Demand & Seasonality Forecast)", desc: "توقع الكميات المطلوبة في مواسم الشتاء والصيف لتجنب نقص الأدوية الموسمية الحساسة.", priority: "عالية جداً 🔥", tech: "Moving Average & Exponential Smoothing ML" },
      { num: 52, title: "تتبع تواريخ الصلاحية بطريقة FEFO المتقدمة (First-Expired, First-Out Tracking)", desc: "إلزام البيع بالتشغيلة الأقرب انتهاءً مع تنبيه الصيدلي قبل 6 أشهر و 3 أشهر لتصريفها.", priority: "عالية جداً 🔥", tech: "Batch Expiry Table + Color Coded Badges" },
      { num: 53, title: "مقارنة عروض أسعار الموردين الآلية (Supplier Price Quote Comparison Matrix)", desc: "إظهار أفضل مورد يقدم أعلى نسبة بونص وأقل سعر للصنف المطلوب مع تاريخ آخر مشتريات.", priority: "عالية جداً 🔥", tech: "Supplier Purchase History + Best Price Ranker" },
      { num: 54, title: "الجرد السريع متعدد الكاميرات عبر الهواتف (Multi-Phone Concurrent Stocktaking)", desc: "جرد الصيدلية أو المستودع بواسطة عدة موظفين في نفس اللحظة بكاميرات هواتفهم ومطابقتها حياً.", priority: "عالية جداً 🔥", tech: "Concurrent Barcode Scanner + Realtime WS Count" },
      { num: 55, title: "تتبع إرجاع الأدوية للشركات والموردين (Supplier Return & Credit Note Tracker)", desc: "إدارة الأصناف الوشيكة وإصدار إشعارات دائنة للموردين ومتابعة سدادها أو استبدالها بدقة.", priority: "عالية جداً 🔥", tech: "Return Vouchers Workflow + Accounting Link" },
      { num: 56, title: "الربط مع الفاتورة الإلكترونية والباركود الموحد (Unified National Drug Code Index)", desc: "ربط الأصناف مع الدليل الدوائي الموحد وتوحيد الأسعار الرسمية والضرائب والخصومات.", priority: "متوسطة ⚡", tech: "NDC Database Sync + Tax Compliant Engine" },
      { num: 57, title: "تتبع حركة الصنف وتحليل الركود (Dead Stock & Slow Moving Identification)", desc: "اكتشاف الأصناف الراكدة التي لم تتحرك منذ 90 يوماً واقتراح عروض وحزم ترويجية لتصريفها.", priority: "عالية جداً 🔥", tech: "Inventory Velocity Metrics + Alert View" },
      { num: 58, title: "إدارة المستودعات الفرعية والتحويل بين الفروع (Inter-Branch Transfer Vouchers)", desc: "طلب تحويل صنف من فرع لآخر مع توثيق الاستلام والتسليم برمز أمان ومطابقة الأرصدة.", priority: "عالية جداً 🔥", tech: "Transfer Slip Model + 2-Step Verification" },
      { num: 59, title: "حساب هامش الربح الحقيقي بعد البونص والخصم (True Margin & Profit Analysis)", desc: "احتساب التكلفة الفعلية للقطعة بعد احتساب بونص المورد والخصم النقدي الممنوح على الفاتورة.", priority: "عالية جداً 🔥", tech: "Weighted Average Unit Cost Calculator" },
      { num: 60, title: "سجل التالف وفاقد التخزين وحوادث الكسر (Damage & Breakage Loss Tracker)", desc: "توثيق الأدوية المنتهية أو التالفة مع الأسباب وتقرير خسائر دوري معتمد لإدارة الضرائب.", priority: "متوسطة ⚡", tech: "Write-Off Protocol + Financial Loss Report" }
    ]
  },
  {
    catNum: 7,
    title: "المحور السابع: منصة الاشتراكات وإدارة المستأجرين (Multi-Tenant SaaS Platform)",
    color: "6D28D9",
    ideas: [
      { num: 61, title: "بوابات الدفع الإلكتروني الليبية للاشتراكات (Sadad, Moamalat, Tadawul, T-Pay)", desc: "تجديد اشتراك الأنشطة التجارية تلقائياً بالدينار الليبي ببطاقات الدفع الإلكتروني المصرفية.", priority: "عالية جداً 🔥", tech: "Libyan Payment Gateways Webhook Integrations" },
      { num: 62, title: "التسجيل الذاتي للشركات مع تجربة مجانية 14 يوماً (Self-Service Signup & Trial)", desc: "إنشاء نشاط تجاري جديد ونطاق فرعي تلقائياً بدون تدخل بشري في 30 ثانية مع تهيئة قواعد البيانات.", priority: "عالية جداً 🔥", tech: "Automated Tenant Provisioning + Trial Cron" },
      { num: 63, title: "تخصيص الهوية البصرية والنطاق الخاص للعملاء (Custom Domain & White Labeling)", desc: "ربط الشركة لنطاقها الخاص (مثل hr.company.ly) مع شعارها وألوانها الرسمية دون إشارة للمنظومة.", priority: "عالية جداً 🔥", tech: "Reverse Proxy Wildcard + Dynamic CSS Variables" },
      { num: 64, title: "لوحة تحكم السوبر أدمن الشاملة لمراقبة السيرفرات (Super Admin Health & MRR)", desc: "مراقبة الإيراد الشهري المتكرر (MRR) ونشاط السيرفر وحالة قواعد البيانات وحجم التخزين.", priority: "عالية جداً 🔥", tech: "Live Metric Dashboard + Docker Health Checks" },
      { num: 65, title: "نظام الإحالة والعمولات للمسوقين (Affiliate & Partner Referral Program)", desc: "توليد كود خصم للشركاء وحساب عمولاتهم على كل نشاط يشترك عبرهم ومتابعة المدفوعات.", priority: "متوسطة ⚡", tech: "Referral Tracking System + Payout Ledger" },
      { num: 66, title: "إيقاف وتجميد الخدمة التلقائي عند انتهاء الاشتراك (Grace Period & Auto-Suspension)", desc: "إشعار النشاط قبل 7 أيام من نهاية الاشتراك وتجميد لوحة التحكم بلطف عند التعثر عن السداد.", priority: "عالية جداً 🔥", tech: "Subscription Expiry Middleware Guard" },
      { num: 67, title: "تصدير النسخ الاحتياطية للأنشطة بنقرة زر (Tenant Data Backup & Portability)", desc: "تمكين كل شركة من تنزيل كامل بياناتها في ملف مضغوط (SQL/JSON/Excel) في أي وقت.", priority: "متوسطة ⚡", tech: "Tenant-Isolated Dump Stream Generator" },
      { num: 68, title: "مركز مساعدة ودعم فني مدمج مع تذاكر فورية (In-App Support Ticket & Chat)", desc: "فتح تذاكر دعم فني ومحادثة الدعم الفني مباشرة من لوحة التحكم مع إمكانية مشاركة الشاشة.", priority: "متوسطة ⚡", tech: "Support Chat Component + Live Status" },
      { num: 69, title: "سجل التغييرات وإشعارات التحديثات للعملاء (In-App Release Notes & Roadmap)", desc: "نافذة تنبثق للعملاء عند إضافة ميزات جديدة تشرح طريقة استخدامها بالفيديو والصور التوضيحية.", priority: "متوسطة ⚡", tech: "What's New Modal + Changelog Markdown" },
      { num: 70, title: "تسعير مرن بحسب عدد الموظفين والفروع (Usage-Based Dynamic Billing)", desc: "حساب سعر الاشتراك بدقة بحسب عدد الموظفين الفعليين النشطين شهرياً وحجم العمليات.", priority: "عالية جداً 🔥", tech: "Dynamic Metered Billing Calculation Engine" }
    ]
  },
  {
    catNum: 8,
    title: "المحور الثامن: ذكاء الأعمال والتحليلات التنبؤية (BI & Predictive Analytics)",
    color: "9D174D",
    ideas: [
      { num: 71, title: "خريطة التركيز الحراري لحركة العملاء والذروة (Peak Hours & Heatmap Analysis)", desc: "تحديد الساعات الأكثر ازدحاماً لتنظيم شفتات الموظفين وتوزيع الكوادر بكفاءة قصوى.", priority: "عالية جداً 🔥", tech: "Recharts Hourly Traffic Visualizer" },
      { num: 72, title: "كاشف الشذوذ في المبيعات ومحاولات الاختلاس (AI Fraud & Anomaly Detection)", desc: "تنبيه الإدارة عند وجود إلغاءات متكررة للفواتير أو فتح درج النقود دون تسجيل بيع.", priority: "عالية جداً 🔥", tech: "Statistical Outlier Detection Algorithm" },
      { num: 73, title: "تحليل كفاءة وإنتاجية الفنيين والمهندسين (Technician Performance Scorecard)", desc: "مقارنة الفنيين من حيث سرعة حل المشاكل، التقييم، وتكلفة قطع الغيار المستخدمة.", priority: "عالية جداً 🔥", tech: "Comparative Leaderboard & Radar Charts" },
      { num: 74, title: "مؤشر ولاء المرضى ومعدل العودة (Patient Retention & Churn Predictor)", desc: "معرفة نسبة الزبائن الدائمين واكتشاف الذين توقفوا عن الشراء لإعادة استهدافهم بعروض مخصصة.", priority: "متوسطة ⚡", tech: "Customer Frequency & Recency Matrix (RFM)" },
      { num: 75, title: "لوحة القيادة التنفيذية للتلفزيونات وشاشات الإدارة (Wallboard TV Kiosk Mode)", desc: "واجهة أنيقة لعرض مؤشرات الأداء الحية على شاشات المكاتب وقاعات الاجتماعات دون الحاجة لتفاعل.", priority: "متوسطة ⚡", tech: "Fullscreen Auto-Refreshing Wallboard View" },
      { num: 76, title: "تقارير أثر الطقس والمواسم على مبيعات الأدوية (Weather Impact Correlation)", desc: "ربط مبيعات أدوية الحساسية والإنفلونزا بتغيرات الطقس ودرجات الحرارة والتنبؤ باحتياجات السوق.", priority: "مستقبلية 🚀", tech: "OpenWeather API Integration + Correlation ML" },
      { num: 77, title: "تصدير التقارير المجدول عبر البريد والواتساب (Automated Scheduled Reports)", desc: "إرسال تقرير PDF أسبوعي فجر كل أحد إلى بريد مجلس الإدارة والمدراء المسؤولين.", priority: "عالية جداً 🔥", tech: "Scheduled Cron + Puppeteer / PDF Renderer" },
      { num: 78, title: "حساب تكلفة الفرصة البديلة للنواقص (Lost Sales Opportunity Analysis)", desc: "حساب إجمالي الأرباح الضائعة بسبب الأصناف غير المتوفرة التي طلبها الزبائن ولم يجدوها.", priority: "عالية جداً 🔥", tech: "Shortage Search Count * Average Margin Formula" },
      { num: 79, title: "تحليل سلة المشتريات والبيع المتقاطع (Market Basket & Cross-Sell Engine)", desc: "اقتراح أصناف مكملة (مثل فيتامين C مع المضاد الحيوي) لزيادة متوسط قيمة الفاتورة.", priority: "عالية جداً 🔥", tech: "Apriori Association Rule Mining" },
      { num: 80, title: "مؤشر الانضباط العام والالتزام بالمواعيد (Company Punctuality Index - CPI)", desc: "درجة تقييم عامة للمنشأة تقيس مدى التزام الكادر ككل باللوائح والورديات مقارنة بالشهر السابق.", priority: "متوسطة ⚡", tech: "Weighted Scoring Aggregate Metric" }
    ]
  },
  {
    catNum: 9,
    title: "المحور التاسع: تجربة الموظف والتحفيز والألعاب (Gamification & Experience)",
    color: "C2410C",
    ideas: [
      { num: 81, title: "نظام أوسمة التميز وموظف الشهر (Employee of the Month & Badges)", desc: "منح أوسمة رقمية تفاعلية (الأكثر انضباطاً، بطل المبيعات، منقذ الشفتات) على ملف الموظف.", priority: "عالية جداً 🔥", tech: "Gamified Profile Badges & Trophies Component" },
      { num: 82, title: "متجر مكافآت النقاط واستبدالها بهدايا وإجازات (Employee Rewards Store)", desc: "جمع نقاط عن كل يوم التزام واستبدالها بساعات تأخير مسموحة أو قسائم شراء وجوائز عينية.", priority: "متوسطة ⚡", tech: "Points Ledger & Virtual Reward Redemption" },
      { num: 83, title: "بطاقة الموظف الذكية لمحفظة أبل وجوجل (Apple & Google Wallet Pass)", desc: "تصدير بطاقة الدوام الرقمية إلى Apple Wallet أو Google Wallet بالباركود لتسهيل المسح.", priority: "متوسطة ⚡", tech: "PassKit (.pkpass) Generator Engine" },
      { num: 84, title: "حائط الإنجازات وتقدير الزملاء الداخلي (Kudos & Peer Recognition Wall)", desc: "إمكانية إرسال بطاقات شكر وتقدير بين الزملاء داخل لوحة التحكم لتعزيز الروح الإيجابية والتعاون.", priority: "متوسطة ⚡", tech: "Interactive Social Wall Component" },
      { num: 85, title: "استبيانات الرضا الوظيفي والمقترحات السرية (Anonymous Employee Feedback)", desc: "صندوق مقترحات سري ومشفر للموظفين لإرسال ملاحظاتهم لإدارة المنشأة بأمان وسرية تامة.", priority: "عالية جداً 🔥", tech: "Encrypted Anonymous Submissions Queue" },
      { num: 86, title: "تذكير المناسبات وأعياد الميلاد والترقيات (Work Anniversary & Celebration Bot)", desc: "تهنئة تلقائية للموظف بيوم ميلاده أو ذكرى انضمامه للعمل في مجموعة واتساب وتكريمه.", priority: "متوسطة ⚡", tech: "Celebration Trigger + Automated Group Graphic" },
      { num: 87, title: "الوضع المظلم المخصص عالي الفخامة (Ultra-Luxe Dark & OLED Mode)", desc: "تصميم داكن مريح للعين وموفر للطاقة لصيادلة الشفتات الليلية والمهندسين الميدانيين.", priority: "عالية جداً 🔥", tech: "Tailwind Dark Theme Selector with Auto-Sunset" },
      { num: 88, title: "نظام دليل الموظف والتدريب التفاعلي (Interactive Onboarding Guide)", desc: "دليل تفاعلي خطوة بخطوة للموظف الجديد لتعريفه بسياسات المنشأة وطريقة استخدام النظام بسهولة.", priority: "متوسطة ⚡", tech: "Intro.js Step-by-Step Tour Flow" },
      { num: 89, title: "طلبات الزي الموحد والمعدات والأدوات (Uniform & Equipment Request Flow)", desc: "طلب مقاسات المعاطف الطبية وأدوات الفحص واستلامها بتوقيع رقمي ومتابعة عهدة كل موظف.", priority: "متوسطة ⚡", tech: "Assets Requisition Module" },
      { num: 90, title: "مؤشر اللياقة والنشاط داخل العمل (Workplace Steps & Wellness Challenge)", desc: "تحدي ترفيهي لعدد الخطوات المقطوعة أثناء الدوام لتعزيز النشاط والحيوية بين الكوادر.", priority: "مستقبلية 🚀", tech: "Pedometer Web API / Google Fit Sync" }
    ]
  },
  {
    catNum: 10,
    title: "المحور العاشر: الأمان المتقدم والامتثال والتطبيقات المدمجة (Enterprise Security & PWA)",
    color: "334155",
    ideas: [
      { num: 91, title: "تطبيق الويب التقدمي فائق السرعة مع التثبيت (Full Offline PWA + App Store Ready)", desc: "تثبيت المنظومة كأيقونة تطبيق مباشر على شاشة الآيفون والأندرويد دون الحاجة لمتجر التطبيقات.", priority: "عالية جداً 🔥", tech: "Service Worker + Manifest.json + Push API" },
      { num: 92, title: "المصادقة الثنائية ببصمة الإصبع ورمز الأمان (2FA / Passkeys / WebAuthn)", desc: "دخول الإدارة عبر بصمة الإصبع أو FaceID للأجهزة الداعمة لأقصى درجات الحماية ومكافحة الاختراق.", priority: "عالية جداً 🔥", tech: "WebAuthn / Passkeys API Integration" },
      { num: 93, title: "سجل التدقيق الجنائي غير القابل للتعديل (Immutable Audit Log & Tamper-Proof)", desc: "تسجيل كل حركة تعديل وقت أو حذف فاتورة مع الـ IP واسم المستخدم وتاريخ الثواني بدقة.", priority: "عالية جداً 🔥", tech: "AuditLog PostgreSQL Model + Trigger Lock" },
      { num: 94, title: "عزل البيانات المشفر لكل نشاط تجاري (Row-Level Security & Encrypted Fields)", desc: "تشفير أرقام الهواتف والبيانات الحساسة في قاعدة البيانات بمفاتيح تشفير AES-256 متقدمة.", priority: "عالية جداً 🔥", tech: "Prisma Middleware Encryption / pgcrypto" },
      { num: 95, title: "كشف الدخول المتزامن من أجهزة متعددة غير مصرح بها (Device Fingerprint Guard)", desc: "منع الموظف من تسجيل الحضور من هاتف زميله عبر قفل الحساب على بصمة الجهاز المعتمدة.", priority: "عالية جداً 🔥", tech: "Device Fingerprinting (Canvas + UserAgent Hash)" },
      { num: 96, title: "النسخ الاحتياطي التلقائي المشفر سحابياً (Automated Encrypted DB Snapshots)", desc: "نسخ احتياطي يومي مشفر يتم رفعه إلى سيرفرات S3 سحابية منعزلة للحماية من الكوارث.", priority: "عالية جداً 🔥", tech: "Cron Script + pg_dump + GPG Encryption + S3" },
      { num: 97, title: "تحديد أوقات الوصول للوحة التحكم وحظر الدخول خارج الدوام (Access Time Window Guard)", desc: "منع الموظف العادي من تصفح بيانات النظام خارج ساعات شفته المعتمدة لحماية سرية العمل.", priority: "متوسطة ⚡", tech: "Role-Based Shift Time Window Validator" },
      { num: 98, title: "كاشف الهجمات ومحاولات التخمين للـ PIN (Brute-Force Rate Limiter & IP Ban)", desc: "قفل الحساب وحظر الـ IP تلقائياً بعد 3 محاولات إدخال رقم سري خاطئ لتأمين الحسابات.", priority: "عالية جداً 🔥", tech: "Redis / In-Memory Rate Limiting Engine" },
      { num: 99, title: "الامتثال لخصوصية بيانات المرضى والملفات الطبية (HIPAA / GDPR Ready Compliance)", desc: "إخفاء بيانات المريض الطبية وتشفيرها بما يوافق المعايير الدولية للسرية وحماية الخصوصية.", priority: "عالية جداً 🔥", tech: "Data Anonymizer & Consent Management" },
      { num: 100, title: "وضع الطوارئ واستمرارية الأعمال محلياً (Disaster Recovery & Local Standalone Node)", desc: "تشغيل سيرفر محلي مصغر داخل الصيدلية يعمل بكفاءة حتى لو انقطع الإنترنت الخارجي بالكامل.", priority: "عالية جداً 🔥", tech: "Local SQLite/Postgres Edge Node + Sync Agent" }
    ]
  }
];

async function generateWordDoc() {
  const doc = new Document({
    sections: [
      {
        properties: {
          bidi: true,
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000
            }
          }
        },
        children: [
          // Banner Table
          new Table({
            alignment: AlignmentType.CENTER,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "0F172A" },
                    margins: { top: 300, bottom: 300, left: 300, right: 300 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        bidirectional: true,
                        children: [
                          new TextRun({
                            text: "🚀 خارطة الطريق والابتكار: 100 فكرة تفاعلية لمنظومة حضورك\n",
                            bold: true,
                            size: 36,
                            font: "Cairo",
                            color: "F8FAFC"
                          }),
                          new TextRun({
                            text: "HodoorK Multi-Tenant SaaS & Pharmacy/Field Intelligence System\n",
                            size: 20,
                            font: "Segoe UI",
                            color: "94A3B8"
                          }),
                          new TextRun({
                            text: "دليل الميزات التنافسية والذكاء الاصطناعي والأتمتة الشاملة للأنشطة التجارية والطبية والخدمية",
                            size: 22,
                            font: "Cairo",
                            color: "38BDF8",
                            bold: true
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // Executive Summary Intro
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "📋 مقدمة الدليل التفاعلي:",
                bold: true,
                size: 24,
                font: "Cairo",
                color: "0F172A"
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "تم إعداد هذه الوثيقة التفاعلية كمرجع هندسي واستثماري متقدم يحتوي على 100 ميزة وفكرة تطبيقية نوعية مصممة خصيصاً للتكامل مع البنية التحتية لمنظومة «حضورك» (Next.js 14, PostgreSQL, Prisma, WAHA/WhatsApp, BNF 83 Clinical AI, OCR, Geofencing). تم تقسيم الأفكار إلى 10 محاور رئيسية، مع تحديد آلية التنفيذ ومستوى الأولوية وخانات تفاعلية للتقييم والمتابعة.",
                size: 21,
                font: "Cairo",
                color: "334155"
              })
            ]
          }),

          // Stats Summary Table
          new Table({
            alignment: AlignmentType.CENTER,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ["عدد الأفكار الإجمالي", "المحاور التقنية", "التقنيات المستخدمة", "العائد المتوقع (ROI)"].map(h =>
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "1E293B" },
                    margins: { top: 120, bottom: 120, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        bidirectional: true,
                        children: [
                          new TextRun({ text: h, bold: true, size: 20, font: "Cairo", color: "FFFFFF" })
                        ]
                      })
                    ]
                  })
                )
              }),
              new TableRow({
                children: ["100 فكرة نوعية", "10 محاور متكاملة", "Next.js / AI / WhatsApp / DB", "ريادة سوقية وتضاعف القيمة"].map(v =>
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
                    margins: { top: 140, bottom: 140, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        bidirectional: true,
                        children: [
                          new TextRun({ text: v, bold: true, size: 19, font: "Cairo", color: "0F172A" })
                        ]
                      })
                    ]
                  })
                )
              })
            ]
          }),

          new Paragraph({ spacing: { after: 300 } }),

          // Render all categories
          ...categories.flatMap(cat => {
            return [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 300, after: 120 },
                children: [
                  new TextRun({
                    text: `📂 ${cat.title}`,
                    bold: true,
                    size: 26,
                    font: "Cairo",
                    color: cat.color
                  })
                ]
              }),

              new Table({
                alignment: AlignmentType.CENTER,
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      { text: "#", width: 6 },
                      { text: "اسم الميزة والابتكار", width: 28 },
                      { text: "شرح الوظيفة والقيمة المضافة", width: 34 },
                      { text: "الأولوية", width: 14 },
                      { text: "البنية والتقنيات (Tech Stack)", width: 12 },
                      { text: "التنفيذ", width: 6 }
                    ].map(col =>
                      new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: cat.color },
                        margins: { top: 100, bottom: 100, left: 80, right: 80 },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: true,
                            children: [
                              new TextRun({ text: col.text, bold: true, size: 19, font: "Cairo", color: "FFFFFF" })
                            ]
                          })
                        ]
                      })
                    )
                  }),
                  ...cat.ideas.map((idea, idx) => {
                    const rowBg = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
                    return new TableRow({
                      children: [
                        // Col 0: Num
                        new TableCell({
                          shading: { type: ShadingType.CLEAR, fill: rowBg },
                          margins: { top: 90, bottom: 90, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              bidirectional: true,
                              children: [
                                new TextRun({ text: String(idea.num), bold: true, size: 18, font: "Cairo", color: "475569" })
                              ]
                            })
                          ]
                        }),
                        // Col 1: Title
                        new TableCell({
                          shading: { type: ShadingType.CLEAR, fill: rowBg },
                          margins: { top: 90, bottom: 90, left: 80, right: 80 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.RIGHT,
                              bidirectional: true,
                              children: [
                                new TextRun({ text: idea.title, bold: true, size: 19, font: "Cairo", color: "0F172A" })
                              ]
                            })
                          ]
                        }),
                        // Col 2: Desc
                        new TableCell({
                          shading: { type: ShadingType.CLEAR, fill: rowBg },
                          margins: { top: 90, bottom: 90, left: 80, right: 80 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.RIGHT,
                              bidirectional: true,
                              children: [
                                new TextRun({ text: idea.desc, size: 17, font: "Cairo", color: "334155" })
                              ]
                            })
                          ]
                        }),
                        // Col 3: Priority
                        new TableCell({
                          shading: { type: ShadingType.CLEAR, fill: rowBg },
                          margins: { top: 90, bottom: 90, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              bidirectional: true,
                              children: [
                                new TextRun({
                                  text: idea.priority,
                                  bold: true,
                                  size: 17,
                                  font: "Cairo",
                                  color: idea.priority.includes("عالية") ? "B91C1C" : (idea.priority.includes("متوسطة") ? "B45309" : "2563EB")
                                })
                              ]
                            })
                          ]
                        }),
                        // Col 4: Tech Stack
                        new TableCell({
                          shading: { type: ShadingType.CLEAR, fill: rowBg },
                          margins: { top: 90, bottom: 90, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              bidirectional: true,
                              children: [
                                new TextRun({ text: idea.tech, size: 16, font: "Segoe UI", color: "475569" })
                              ]
                            })
                          ]
                        }),
                        // Col 5: Interactive Checkbox
                        new TableCell({
                          shading: { type: ShadingType.CLEAR, fill: rowBg },
                          margins: { top: 90, bottom: 90, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              bidirectional: true,
                              children: [
                                new TextRun({ text: "☐", size: 24, font: "Segoe UI Symbol", color: "64748B" })
                              ]
                            })
                          ]
                        })
                      ]
                    });
                  })
                ]
              }),
              new Paragraph({ spacing: { after: 200 } })
            ];
          }),

          // Implementation Matrix
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: "🎯 خطة التنفيذ المقترحة والجدول الزمني (Implementation Matrix):",
                bold: true,
                size: 26,
                font: "Cairo",
                color: "0F172A"
              })
            ]
          }),

          ...[
            "1. المرحلة الأولى (Quick Wins - الأسبوع 1 إلى 3): تفعيل ميزات الأولوية العالية في الواتساب والرواتب الذكية والتوقيع الإلكتروني المشفر.",
            "2. المرحلة الثانية (Core Enhancements - الأسبوع 4 إلى 8): إطلاق محرك التداخلات الدوائية المتقدم والتحقق بالوجه وتوليد عقود الصيانة الدورية.",
            "3. المرحلة الثالثة (Scale & Monetization - الأسبوع 9 إلى 12): ربط بوابات الدفع الإلكتروني الليبية (تداول، سداد، ت-باي) وباقة الـ White Label للمشتركين الكبار."
          ].map(pt =>
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 100 },
              children: [
                new TextRun({ text: pt, size: 21, font: "Cairo", color: "334155" })
              ]
            })
          )
        ]
      }
    ]
  });

  const outputPath = path.resolve('I:/at/100_Innovative_Ideas_HodoorK_System.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully generated at: ${outputPath}`);
}

generateWordDoc().catch(err => {
  console.error("Error generating word doc:", err);
  process.exit(1);
});
