# Project Rules & Customizations: HodoorK & Pharmacy Intelligence System

### 1. قواعد تطوير المنظومة الصيدلانية والسريرية (Clinical & Pharmacy Intelligence Architecture)
- **المرجع الدوائي البريطاني الرسمي (BNF 83):**
  - اعتماد محرك مونوغرافات **BNF 83 (March 2022 - Pharmaceutical Press & NICE UK)** المفهرس في `docs/bnf/` و `src/data/bnf_knowledge.json` و `src/lib/bnfKnowledge.ts` كمرجع ذهبي إلزامي وثابت لتوثيق الجرعات، موانع الاستعمال، التحذيرات للكلى والكبد، والحمل والرضاعة.
  - خط التغذية الحي المتعدد: الربط التلقائي بين BNF 83 و OpenFDA Full Labels و DailyMed NIH و EMC UK والشركات المصنعة (Pharco, Eipico, Jamjoom).

### 2. معايير قراءة ومطابقة الباركود (Strict Barcode & Dual-Database Sync)
- **المطابقة الصارمة (Strict Exact Barcode Matching):**
  - عند مسح الباركود بالكاميرا أو الماسح، يجب إجراء مطابقة تامة مع الباركود الكامل أو مع/بدون الصفر البادئ فقط. يمنع منعاً باتاً المطابقة الجزئية للأرقام القصيرة (Substring collisions) لتجنب ظهور أصناف خاطئة.
- **تطابق القاعدتين المحلية والسحابية (100% Barcode Parity):**
  - وكيل المزامنة المحلي لإنفينيتي (`sync-agent/sync-agent.js`) يجب أن يستخرج كافة باركودات الصنف الدولية والمحلية والعبوات (`Data_ProductUOMs.BarCode`, `Data_Products.BarCode`, `InternationalBarCode`, `ProductCode`) ويحفظها مدمجة في حقل `barcodes` في قاعدة PostgreSQL السحابية.
- **الأصناف غير المسجلة ونشرات الأدوية (Leaflet OCR):**
  - عند عدم وجود الصنف في قاعدة البيانات، يتم وضع الباركود في خانة البحث مع إظهار تنبيه واضح وزر فوري لتصوير نشرة المنتج (Leaflet) وتوثيق تركيبته وحفظها سحابياً.

### 3. قواعد الرواتب وساعات العمل والحسابات المزدوجة
- **النمط المرن**: إعطاء الأولوية دائماً لنظام تدوين الساعات المرنة والمشاريع (Flexible & Project-based Hours Tracker) عند عدم وجود شفتات ثابتة.
- **معادلة الراتب المزدوج**:
  - `Total Due = (Attendance Hours * Direct Hourly Rate) + ((Attendance Hours * Job Role Monthly Salary) / Job Role Target Hours)`.
  - معالجة الورديات المتقاطعة مع منتصف الليل (Overnight Shifts) تلقائياً دون أي أخطاء زمنية أو تاريخية.

### 4. التكاملات وتجربة المستخدم (UX & Integrations)
- **التكامل المعزز**: توفير زر إعادة ضبط المصنع (Factory Reset) والربط مع Webhook لـ n8n للواتساب وتوفير بطاقة موظف قابلة للطباعة (ID Badge).
- **التصميم الناصع**: استخدام المظهر الفاتح البسيط (Crisp Light Mode) بدعم اللغة العربية واتجاه RTL (خط Cairo، والأرقام الإنجليزية 0-9 حصراً).
- **ألوان العمليات**: أزرار الدخول باللون الأزرق (Blue)، وأزرار الخروج باللون الأحمر (Red).

### 5. النشر والتحديث التلقائي للسيرفر (Auto Deploy)
- عند إتمام أي عملية أو ميزة أو إصلاح خطأ، يجب فوراً عمل Commit و Push ومسح الكاش وإعادة بناء وتشغيل التطبيق على المخدم المباشر (102.203.201.52 / Coolify) تلقائياً دون الحاجة لطلب ذلك يدوياً.
