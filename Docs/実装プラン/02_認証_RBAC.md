# 02 隱崎ｨｼ / RBAC

蟇ｾ蠢懆ｦ∽ｻｶ・・
- `NFR-SEC-01・・ust・荏 隱崎ｨｼ・医Ο繧ｰ繧､繝ｳ・牙ｿ・・
- `NFR-SEC-02・・ust・荏 繝ｭ繝ｼ繝ｫ縺ｫ蝓ｺ縺･縺上い繧ｯ繧ｻ繧ｹ蛻ｶ蠕｡
- `隕∽ｻｶ螳夂ｾｩ譖ｸ 5遶` 諠ｳ螳壹Ο繝ｼ繝ｫ・・dmin / 蝟ｶ讌ｭ / 驕狗畑 / 髢ｲ隕ｧ縺ｮ縺ｿ・・

---

## 譁ｹ驥晢ｼ・VP・・

- 繧｢繝励Μ蜀・Θ繝ｼ繧ｶ繝ｼ繧奪B縺ｧ邂｡逅・ｼ亥・譛歛dmin縺ｯ繧ｷ繝ｼ繝会ｼ・
- 隱崎ｨｼ縺ｯ縲後Ο繧ｰ繧､繝ｳ竊偵そ繝・す繝ｧ繝ｳ・・WT or 繧ｵ繝ｼ繝舌・繧ｻ繝・す繝ｧ繝ｳ・峨阪・縺ｩ縺｡繧峨〒繧ょ庄
- 讓ｩ髯舌・ **API蛛ｴ縺ｧ蠑ｷ蛻ｶ**・医ヵ繝ｭ繝ｳ繝医・陦ｨ遉ｺ蛻ｶ蠕｡縺ｮ縺ｿ縺ｧ縲∵ｨｩ髯舌・譛邨ょ愛譁ｭ縺ｯ繝舌ャ繧ｯ繧ｨ繝ｳ繝会ｼ・

---

## 螳御ｺ・擅莉ｶ・・oD・・

- AI・咾ookie/Authorization縺ｮ荳｡譁ｹ縺ｧ隱崎ｨｼ縺ｧ縺阪ｋ・亥ｰ代↑縺上→繧・ookie縺悟虚縺擾ｼ・
- AI・啌BAC縺後窟PI縺ｧ縲榊ｼｷ蛻ｶ縺輔ｌ繧具ｼ・eadonly縺ｯ譖ｴ譁ｰ邉ｻ403・・
- AI・啻frontend` 縺九ｉ `backend` 縺ｮ隱崎ｨｼAPI縺ｫ蛻ｰ驕斐〒縺阪ｋ・・/api` 繝励Ξ繝輔ぅ繝・け繧ｹ謨ｴ蜷茨ｼ・
- AI・夊・蜍輔ユ繧ｹ繝医′縲悟ｮ溯｣・ｼ・outes/middleware・峨阪ｒ逶ｴ謗･讀懆ｨｼ縺励※縺・ｋ・医ユ繧ｹ繝亥・縺ｫ繝ｫ繝ｼ繝医ｒ繧ｳ繝斐・縺励↑縺・ｼ・
- AI・啻backend`/`frontend` 縺ｮ `lint`/`test`/`build` 縺梧・蜉溘＠縲～git push` 貂医∩

---

## TODO・・DD・・

### Backend・・I・・

- [x] `POST /auth/login`・域・蜉・螟ｱ謨暦ｼ・
- [x] `POST /auth/logout`
- [x] `GET /auth/me`
- [x] 繝ｭ繝ｼ繝ｫ・啻admin`, `sales`, `ops`, `readonly`・井ｻｮ・・
- [x] 繧ｬ繝ｼ繝・繝溘ラ繝ｫ繧ｦ繧ｧ繧｢縺ｧ RBAC 繧貞ｮ溯｣・ｼ医Ν繝ｼ繝亥腰菴搾ｼ・
- [x] Admin縺ｮ縺ｿ・壹Θ繝ｼ繧ｶ繝ｼ菴懈・/繝ｭ繝ｼ繝ｫ螟画峩・域怙蟆上〒OK・・
- [x] API縺ｮ繝吶・繧ｹ繝代せ繧堤ｵｱ荳縺吶ｋ・域耳螂ｨ・啻/api/*` 繧鍛ackend縺ｫ蟇・○繧・or frontend縺ｮ`/api`繧貞､悶☆・・
- [x] Cookie縺九ｉ繧・`jwtVerify` 縺ｧ縺阪ｋ繧医≧ `@fastify/jwt` 繧定ｨｭ螳夲ｼ井ｾ具ｼ啻cookie: { cookieName: 'token', signed: false }`・・
- [x] `requireAuth()` 縺・Cookie/Authorization 縺ｮ荳｡譁ｹ縺ｧ蜍輔￥縺薙→繧堤｢ｺ隱搾ｼ医さ繝｡繝ｳ繝医→螳溯｣・ｒ荳閾ｴ縺輔○繧具ｼ・

### Backend tests・・I・・

- [x] 繝代せ繝ｯ繝ｼ繝峨ワ繝・す繝･讀懆ｨｼ・・crypt遲会ｼ・
- [x] 譛ｪ繝ｭ繧ｰ繧､繝ｳ縺ｯ 401
- [x] 繝ｭ繝ｼ繝ｫ荳崎ｶｳ縺ｯ 403
- [x] readonly 縺ｯ譖ｴ譁ｰ邉ｻ繧呈拠蜷ｦ
- [x] `authRoutes`/`rbac` 縺ｮ縲悟ｮ溘ヵ繧｡繧､繝ｫ縲阪ｒ逋ｻ骭ｲ縺励※繝・せ繝医☆繧具ｼ医ユ繧ｹ繝亥・縺ｧ繝ｫ繝ｼ繝亥ｮ溯｣・ｒ隍・｣ｽ縺励↑縺・ｼ・
- [x] Cookie繝ｭ繧ｰ繧､繝ｳ竊辰ookie莉倥″繝ｪ繧ｯ繧ｨ繧ｹ繝医〒菫晁ｭｷ繝ｫ繝ｼ繝医↓騾壹ｋ繝・せ繝医ｒ霑ｽ蜉
- [x] `/api` 繝励Ξ繝輔ぅ繝・け繧ｹ縺ｮ逍朱壹ユ繧ｹ繝茨ｼ医ヵ繝ｭ繝ｳ繝域Φ螳壹・繝代せ縺ｧ404縺ｫ縺ｪ繧峨↑縺・ｼ・

### Frontend・・I・・

- [x] 繝ｭ繧ｰ繧､繝ｳ逕ｻ髱｢
- [x] 繝ｭ繧ｰ繧､繝ｳ迥ｶ諷九・菫晄戟・・ookie/繝倥ャ繝・・
- [x] 逕ｻ髱｢縺ｮ繧ｬ繝ｼ繝会ｼ域悴繝ｭ繧ｰ繧､繝ｳ縺ｯ繝ｭ繧ｰ繧､繝ｳ縺ｸ・・
- [x] 繝ｭ繝ｼ繝ｫ縺ｫ蠢懊§縺溘Γ繝九Η繝ｼ陦ｨ遉ｺ・医◆縺縺輸PI縺梧悽菴難ｼ・
- [x] `fetch` 縺ｮ繝代せ繧鍛ackend縺ｨ荳閾ｴ縺輔○繧具ｼ・/api` 繧貞性繧√ｋ縺ｪ繧叡ackend蛛ｴ繧ょｯｾ蠢懶ｼ・
- [x] `ProtectedRoute` 縺ｮ謖吝虚繧偵ユ繧ｹ繝医〒諡・ｿ晢ｼ域悴繝ｭ繧ｰ繧､繝ｳ竊・login縲√Ο繝ｼ繝ｫ荳崎ｶｳ竊呈拠蜷ｦ陦ｨ遉ｺ・・

### AI讀懆ｨｼ・・I縺悟ｮ溯｡鯉ｼ・

- [x] `cd infra; docker compose up -d`
- [x] `cd backend; npm ci; npm run prisma:generate; npm run migrate:dev; npm run seed`
- [x] `cd backend; npm run test; npm run lint; npm run build`
- [x] `cd frontend; npm ci; npm run test; npm run lint; npm run build`
- [ ] `backend`/`frontend` 繧定ｵｷ蜍輔＠縲√Ο繧ｰ繧､繝ｳ竊偵ヨ繝・・逕ｻ髱｢驕ｷ遘ｻ縺後〒縺阪ｋ・・2E or 譛蟆上せ繝｢繝ｼ繧ｯ・・

### 莠ｺ髢謎ｽ懈･ｭ・亥ｿ・医・縺ｿ・・

- [ ] 蛻晄悄繝ｦ繝ｼ繧ｶ繝ｼ・・dmin/sales/ops/readonly・峨・繝｡繝ｼ繝ｫ/繝代せ繝ｯ繝ｼ繝峨ｒ驕狗畑縺ｫ蜷医ｏ縺帙※螟画峩縺吶ｋ・・backend/prisma/seed.ts`・・
- [ ] 譛ｬ逡ｪ逕ｨ縺ｮ `JWT_SECRET` 繧呈ｱｺ繧√※螳牙・縺ｫ邂｡逅・☆繧・

### Git・・I・・

- [ ] `git add -A`
- [ ] `git commit -m "feat: auth and rbac"`
- [ ] `git push`

