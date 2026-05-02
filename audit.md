# AUDIT SYSTÈME D'AGENTS — UBURN COCKPIT

**Date** : 2026-04-29
**Repo** : `uburn-cockpit` (Next.js 15 / Supabase / Vercel-Cloud Run)
**Périmètre** : `src/services/agents/`, `src/services/skills/`, `src/services/agent-manager/`, `src/app/api/chat/`, `src/app/api/cron/`
**Mission** : audit lecture-seule, identifier la racine du problème "outputs médiocres / fictifs / hors charte"

---

## TL;DR (3 lignes)

1. **7 skills sur 10 produisent du contenu 100 % hardcoded** dans le source TypeScript : prix faux (29.90 € au lieu de 34.50 €), produit faux ("glass bottle" au lieu de poudre), témoignages inventés, "+2000 français" inventé. Pas d'IA, donc régénérer ne change rien tant que le code n'est pas réécrit.
2. **0 mention** de `glucomannane`, `konjac`, `satiété 4h`, `30 kcal`, `L-carnitine`, `MCT coco`, `fibre acacia`, `gingembre violet`, `ube violet`, `EFSA` dans **aucun** skill ni prompt système. La charte obligatoire Uburn n'existe pas dans le code.
3. **`/api/chat` retombe silencieusement sur des mocks** dès qu'une API externe échoue (Shopify token expiré → mock data). Le SYSTEM_PROMPT ne dit pas à Claude que les chiffres peuvent être fictifs ⇒ "chat IA invente des données" est mécaniquement garanti.

---

# LIVRABLE 1 — INVENTAIRE

## A. AGENTS (8 agents autonomes + 1 base utilitaire)

Chemin : [src/services/agents/](src/services/agents/) — orchestrés via [src/app/api/cron/route.ts](src/app/api/cron/route.ts)

| # | Agent | Fichier | Mission (1 phrase) | Skills appelés | Modèle IA | Statut typique |
|---|---|---|---|---|---|---|
| 0 | **base** | [base.ts](src/services/agents/base.ts) | Utilitaires Supabase (logAction, getConfig, isDue, updateLastRun) | — | aucun | infra |
| 1 | **content** | [content-agent.ts](src/services/agents/content-agent.ts) | Cycle 12h : brief → créas pub → images IA → infographies → social → 3 emails approbation | `brief-crea`, `ad-creative-generator`, `image-generator`, `infographic-generator`, `post-social` + `email-approval` | aucun (orchestrateur) | succès apparent / **outputs fictifs** |
| 2 | **crea** | [crea-agent.ts](src/services/agents/crea-agent.ts) | Analyse heuristique perfs créatives Meta (hook rate, CTR, ROAS, fatigue) sur 14j | aucun (lit `getRealMetaAdsData`) | aucun | dépend Meta token |
| 3 | **email-crm** | [email-agent.ts](src/services/agents/email-agent.ts) | Détecte abandons / nouveaux clients / repeat / win-back via Shopify Admin API (24-60j) | aucun (fetch Shopify direct) | aucun | **bloqué si token Shopify 401** |
| 4 | **ga4** | [ga4-agent.ts](src/services/agents/ga4-agent.ts) | Détecte chute/spike trafic, dépendance source, retention (30j) | aucun (fetch `/api/ga4`) | aucun | dépend creds GA4 |
| 5 | **growth** | [growth-agent.ts](src/services/agents/growth-agent.ts) | Rapport quotidien synthèse multi-source + 3 actions du jour + projection 100 cmd/j | aucun (fetch 4 APIs) | aucun | dépend toutes APIs |
| 6 | **meta-ads** | [meta-ads-agent.ts](src/services/agents/meta-ads-agent.ts) | Auto-pause ROAS<0.8x, recommandations scale ROAS>2x, alerte budget journalier | aucun (fetch + POST Meta) | aucun | dépend Meta token |
| 7 | **sendcloud** | [sendcloud-agent.ts](src/services/agents/sendcloud-agent.ts) | Détecte colis bloqués >48h, taux de livraison <90 %, retards par transporteur | aucun (fetch SC) | aucun | dépend SC creds |
| 8 | **shopify** | [shopify-agent.ts](src/services/agents/shopify-agent.ts) | Tendance AOV 7j vs 30j, repeat customers, low order volume | aucun (fetch Shopify) | aucun | **bloqué si token 401** |

**Inputs/Outputs**
- Inputs : config Supabase (`agent_config` : `enabled`, `interval_hours`, `thresholds`, `last_run`) + données live des APIs externes.
- Outputs : `actions[]` (tableau de strings) + écriture `agent_logs` Supabase (status `success` / `warning` / `error`). Pour `content` : déclenche 3 emails Resend.

**Prompt système** : aucun agent n'utilise de modèle IA (sauf l'agent-manager du chat). Le code TypeScript contient des règles `if/else` sur des seuils.

**Cron** : [src/app/api/cron/route.ts](src/app/api/cron/route.ts:34) itère sur `getAllConfigs()` et appelle l'agent dont `isDue(config)` est vrai. Auth via header `x-cron-secret`. Cloud Scheduler → Cloud Run europe-west1.

---

## B. AGENT MANAGER (chat orchestrateur)

Chemin : [src/services/agent-manager/](src/services/agent-manager/) — exposé via [src/app/api/chat/route.ts](src/app/api/chat/route.ts)

| Composant | Fichier | Rôle |
|---|---|---|
| **tools.ts** | [tools.ts](src/services/agent-manager/tools.ts) | Définit 11 outils JSON-Schema (10 skills + `run_agent` + `send_approval_email`) pour Anthropic function calling |
| **executor.ts** | [executor.ts](src/services/agent-manager/executor.ts) | Route `tool_use` → skill/agent + persiste `sessionResults` + sauve `content_library` Supabase |
| **chat/route.ts** | [chat/route.ts](src/app/api/chat/route.ts) | Boucle agentique max 4 itérations, modèle `claude-haiku-4-5-20251001`, max_tokens 2048 |

**Modèle** : `claude-haiku-4-5-20251001` (Haiku 4.5).
**Max iterations** : 4 (timeout Vercel 60s).
**System prompt** : 87 lignes ([chat/route.ts:63-149](src/app/api/chat/route.ts#L63-L149)) — décrit rôle, flows typiques, capacités. **Ne contient ni la charte copy, ni les ingrédients officiels, ni la cible démo, ni les prix réels.**

---

## C. SKILLS (10 skills)

Chemin : [src/services/skills/](src/services/skills/)

| # | Skill | Fichier | Fonction (1 phrase) | Agents qui l'utilisent | Dépendances externes | Modèle IA |
|---|---|---|---|---|---|---|
| 1 | **brief-crea** | [brief-crea.ts](src/services/skills/brief-crea.ts) | Génère un brief créatif (urgence, hooks, CTAs, formats) à partir des perfs Meta+Shopify | content-agent, agent-manager | `/api/meta-ads`, `/api/shopify` | **aucun (hooks/CTAs/formats hardcoded L72-97)** |
| 2 | **ad-creative-generator** | [ad-creative-generator.ts](src/services/skills/ad-creative-generator.ts) | Génère 6 variations de créas pub Meta (story/feed/square/landscape) + appel Bannerbear | content-agent, agent-manager | Bannerbear API, `/api/meta-ads`, `/api/shopify` | **aucun (6 créas 100 % hardcoded L165-306)** |
| 3 | **image-generator** | [image-generator.ts](src/services/skills/image-generator.ts) | Génère images via Replicate FLUX 1.1 Pro à partir de prompts | content-agent, agent-manager | Replicate FLUX | FLUX (image), prompts hardcoded |
| 4 | **infographic-generator** | [infographic-generator.ts](src/services/skills/infographic-generator.ts) | Génère 6 infographies (product-benefits, weekly-stats, comparison, process, social-proof, funnel) via Napkin AI | content-agent, agent-manager | Napkin AI, 3 APIs data | **aucun (contenus hardcoded L109-222)** |
| 5 | **post-social** | [post-social.ts](src/services/skills/post-social.ts) | Plan 7 posts Instagram/TikTok/Facebook avec captions, hooks, hashtags, bestTime | content-agent, agent-manager | 3 APIs data | **aucun (7 posts hardcoded L54-125)** |
| 6 | **email-sequence** | [email-sequence.ts](src/services/skills/email-sequence.ts) | 5 séquences email (abandon/welcome/winback/vip/post-purchase) avec placeholders `{{prénom}}` | agent-manager | `/api/shopify` | **aucun (5 séquences hardcoded L44-190)** |
| 7 | **analyse-ga4** | [analyse-ga4.ts](src/services/skills/analyse-ga4.ts) | Analyse trafic GA4 7j vs 7j précédents + insights/recommandations | agent-manager | `/api/ga4`, `/api/shopify`, `/api/meta-ads` | aucun (heuristique) |
| 8 | **rapport-hebdo** | [rapport-hebdo.ts](src/services/skills/rapport-hebdo.ts) | Rapport hebdo synthèse 4 sources + highlights/warnings/3 actions | agent-manager | 4 APIs data | aucun (heuristique) |
| 9 | **landing-analyzer** | [landing-analyzer.ts](src/services/skills/landing-analyzer.ts) | Fetch HTML d'une URL + analyse UX/CRO via Claude | agent-manager | Anthropic Claude | **`claude-sonnet-4-20250514`** |
| 10 | **ab-test-generator** | [ab-test-generator.ts](src/services/skills/ab-test-generator.ts) | Génère plans A/B (variantes, hypothèses, CSS/HTML) via Claude | agent-manager | Anthropic Claude (+ landing-analyzer) | **`claude-sonnet-4-20250514`** |

**Constat majeur** : sur 10 skills, seulement 3 utilisent une IA générative (`landing-analyzer`, `ab-test-generator`, `image-generator`). Les 7 autres sont des **arbres de littéraux** : régénérer 100 fois le contenu produit toujours les mêmes textes.

---

## D. RÉFÉRENTIEL ENV / APIs (état 2026-04-29)

Source : [.env](.env)

| API | Variable | Présence | Statut probable |
|---|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | **absente** | ⚠️ chat + landing-analyzer + ab-test-generator KO |
| Meta Ads | `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` | présents | ok si token user-token non expiré |
| Shopify | `SHOPIFY_ACCESS_TOKEN` (renouvelé 2026-04-13, expire 24h) | **expiré depuis ~16 jours** | ❌ tout pipe Shopify retombe sur mock |
| GA4 | `GA4_PROPERTY_ID` (creds JSON manquant) | partiel | ⚠️ probable mock |
| Sendcloud | `SENDCLOUD_API_KEY/SECRET` | **absentes** | ❌ mock |
| Supabase | `SUPABASE_URL` + `SERVICE_ROLE_KEY` | présents | ok |
| Resend | `RESEND_API_KEY` | présent | ok |
| Bannerbear | `BANNERBEAR_API_KEY` | absente | mock (uid placeholder) |
| Replicate | `REPLICATE_API_TOKEN` | absente | mock |
| Napkin AI | `NAPKIN_API_KEY` | absente | mock |

---

# LIVRABLE 2 — DIAGNOSTIC

## A. Tableau de diagnostic par agent

| Agent | Skills mal assignés | Skills manquants | Skills redondants | Prompts génériques | Violations charte (via skills) |
|---|---|---|---|---|---|
| **content** | `image-generator` et `infographic-generator` font tous deux du visuel statique → confusion | `brand-knowledge` (injection ingrédients/cible/prix), `claim-validator` (filtre EFSA + interdits), `product-data-grounding` (fact-checker) | `image-generator` ⊃ `infographic-generator` (FLUX peut faire les deux) ; `brief-crea` ⊃ partie de `analyse-ga4` (perfs ads) | n/a (orchestrateur) | **massives** : prix 29.90€, "glass bottle", "+2000 français", témoignages inventés, "3x plus d'antioxydants", "anti-inflammatoire", "boost humeur" — voir détail §B |
| **crea** | OK (bon scope, agnostique du copy) | Skill IA pour formuler verbatim les angles à tester (basé sur winners) | aucun | n/a | aucune (ne génère pas de copy) |
| **email-crm** | OK | Skill pour pousser réellement les séquences vers Klaviyo/Resend (aujourd'hui : juste détection + log) | aucun | n/a | aucune (ne génère pas de copy ; skills `email-sequence` séparé) |
| **ga4** | OK | aucun | partielle redondance avec `analyse-ga4` skill (l'agent fait surveillance, le skill fait reporting — frontière floue) | n/a | aucune |
| **growth** | OK | aucun | redondance avec `rapport-hebdo` skill (≈ même synthèse sur 7j) | n/a | aucune |
| **meta-ads** | OK | aucun | aucun | n/a | aucune |
| **sendcloud** | OK | aucun | aucun | n/a | aucune |
| **shopify** | OK | aucun | aucun | n/a | aucune |
| **agent-manager** (chat) | n/a | `brand-knowledge` injecté en system prompt ; un guardrail "ne pas inventer de chiffre" | aucun | **OUI — voir §C** | indirectes via les skills appelés |

## B. Violations charte copy détaillées

Référentiel produit officiel ([COMPANY.md](COMPANY.md)) :
- Produit = **boisson UBE EN POUDRE** (jar)
- Prix officiel = **34.50 €** (1 jar) / **54.50 €** (2 jars)
- USP = **4h de satiété**, **0 % caféine**, **30 kcal/portion**, **6 actifs naturels**
- Ingrédients = **konjac (glucomannane → claim EFSA satiété)**, **MCT coco**, **L-carnitine**, **gingembre**, **fibre acacia**, **ube violet bio**
- Cible = **Femmes 35-55**, France, **anti-snacking**

### Vérification mots INTERDITS dans le code

| Terme interdit | Occurrences | Localisation |
|---|---|---|
| "brûle-graisses" | 0 | ✓ clean |
| "minceur" | 0 | ✓ clean |
| "maigrir" | 0 | ✓ clean |
| **"healthy"** | **plusieurs** | post-social.ts L59 (`#healthy`), L83, L99 ; ad-creative-generator.ts L210 ("healthy lifestyle") ; image-generator.ts (commentaires) — ❌ VIOLATION |
| "café vert" | 0 | ✓ clean |
| "satisfait ou remboursé 30 jours" | 0 | ✓ clean |

### Vérification mots OBLIGATOIRES dans le code

| Terme obligatoire | Occurrences | Statut |
|---|---|---|
| **glucomannane** | **0** | ❌ jamais cité |
| **konjac** | **0** | ❌ jamais cité |
| **satiété** | **0** (sauf COMPANY.md) | ❌ jamais cité |
| **30 kcal** | **0** | ❌ jamais cité |
| **4h / 4 heures** (satiété) | **0** | ❌ jamais cité |
| **L-carnitine** | **0** | ❌ jamais cité |
| **MCT coco** | **0** | ❌ jamais cité |
| **fibre acacia** | **0** | ❌ jamais cité |
| **gingembre violet** | **0** | ❌ jamais cité |
| **ube violet** (bio) | **0** | ❌ jamais cité |
| **EFSA** | **0** | ❌ jamais cité |

→ **La charte obligatoire n'existe pas dans le code.** Aucun skill ne peut citer un ingrédient officiel ni la claim EFSA satiété, parce qu'aucun de ces termes n'a jamais été écrit dans le repo.

### Inventions / claims non sourcés repérés

| Skill | Ligne | Contenu fictif | Vérité |
|---|---|---|---|
| ad-creative-generator | L196 | "3x plus d'antioxydants que le matcha" | Claim non sourcée |
| ad-creative-generator | L210 | "Hommes/Femmes 22-40, healthy lifestyle" | Cible réelle = Femmes 35-55 |
| ad-creative-generator | L218 | "Déjà adopté par +2000 français" | Chiffre inventé |
| ad-creative-generator | L227 | "Marine, 28 ans" — témoignage | Inventé |
| ad-creative-generator | L243 | "Pack Découverte 6 bouteilles 23.90€ au lieu de 29.90€" | Produit ≠ bouteille (poudre/jar) ; prix réel 34.50€/54.50€ |
| ad-creative-generator | L262 | "Code DECOUVERTE20" | Code promo inventé |
| ad-creative-generator | L287-300 | "Antioxydants puissants / Anti-inflammatoire / Soutient digestion / Boost humeur" | Claims santé non autorisés EFSA |
| image-generator | L61, L136, L141, L161, L165 | "glass bottle", "drink bottle", "drink bottles" (×6 prompts) | Produit = poudre, pas boisson en bouteille |
| image-generator | L156 | "young athletic woman after workout" | Cible réelle = Femmes 35-55 anti-snacking |
| image-generator | L171 | "Before/After: coffee → ube drink with energy glow" | Claim "énergie" pas claim Uburn (= satiété) |
| infographic-generator | L114-122 | "ANTIOXYDANTS 3x matcha / ANTI-INFLAMMATOIRE / Anthocyanines fonction cognitive / Sérotonine" | Claims santé non EFSA |
| infographic-generator | L150-159 | Comparatif Uburn vs Café/Matcha/**Red Bull** "Prix 3.90€" | Comparatif Red Bull non pertinent ; prix faux |
| infographic-generator | L184-194 | 5 témoignages clients + "+2000 clients / 4.8/5 / repeat 35%" | 100 % inventé |
| post-social | L58 | "3 bénéfices : Énergie naturelle sans crash / Antioxydants puissants / Goût qui rend accro" | Claims pas alignées sur satiété 4h |
| post-social | L78 | "5 raisons de remplacer ton café par Uburn" | Uburn = anti-snacking, pas substitut café |
| post-social | L107 | "Mon avis honnête après 30 jours d'Uburn" | UGC fictif suggéré |
| email-sequence | L62, L70, L130, L138 | "REVIENS10 / DERNIERECHANCE / COMEBACK20 / LASTCHANCE" | Codes promo inventés sans validation marketing |
| email-sequence | L96 | "3 façons : Glacé / Smoothie bowl / Latte chauffé" | Usages non documentés (préparation officielle Uburn ?) |
| email-sequence | L130 | "Lancé de nouvelles saveurs" | Uburn n'a qu'une saveur |
| email-sequence | L156 | "Livraison gratuite à vie" | Promesse non validée |
| brief-crea | L72-79 | 8 hooks dont "3x plus d'antioxydants que le matcha", "Made in France inspiré d'Asie" | Hooks bibliothèque hardcodée, pas générée des winners |
| landing-analyzer | L102, L104 | "Prix : environ 29€ le pack" dans le system prompt | **Le prompt envoyé à Claude contient un prix faux** → biais l'audit CRO |
| ab-test-generator | L102, L104 | Idem | Idem |

## C. Bug "Chat IA génère des données fictives"

**Cause racine** : [chat/route.ts:28-46](src/app/api/chat/route.ts#L28-L46)

```ts
const safeCall = async <T>(real, mock) => { try { return await real(); } catch { return mock(); } };
```

Conséquence en chaîne :
1. Le token Shopify (renouvelé 2026-04-13, expire 24h) est expiré depuis ~16 jours.
2. `getRealShopifyData()` lance une erreur 401.
3. `safeCall` **avale silencieusement** l'erreur et retourne `getMockShopifyData(range)`.
4. Le mock contient des chiffres plausibles mais 100 % synthétiques.
5. Le SYSTEM_PROMPT ne dit nulle part "ces chiffres peuvent être mock" → Claude présente comme réels.
6. Charles voit "CA 12 540 €, 287 commandes" → croit que c'est vrai.

**Aggravant** : les skills `brief-crea`, `ad-creative-generator`, `infographic-generator`, `post-social`, `analyse-ga4`, `rapport-hebdo` font `fetch /api/shopify`, `/api/meta-ads`, `/api/ga4` — chacune de ces routes API a son propre fallback mock. Donc l'orchestrateur `content-agent` toutes les 12h **génère et envoie par email des créas pub fondées sur des chiffres fictifs** sans que personne ne le voie.

## D. Impact des dépendances cassées

### Token Shopify 401

Impacte directement :
- `agents/shopify-agent.ts` (utilise `getRealShopifyData`)
- `agents/email-agent.ts` (utilise `shopifyGet` direct)
- `/api/shopify` route → fallback mock
- `agents/growth-agent.ts` (via `/api/shopify`)

Impacte indirectement (via `/api/shopify` mock) :
- `skills/brief-crea.ts`
- `skills/ad-creative-generator.ts`
- `skills/infographic-generator.ts`
- `skills/post-social.ts`
- `skills/email-sequence.ts`
- `skills/rapport-hebdo.ts`
- `skills/analyse-ga4.ts`
- `agents/content-agent.ts` (cycle 12h complet sur mock)
- `/api/chat` (gatherBusinessContext)

→ **9 surfaces sur 18** sont impactées par un seul token expiré.

### Crédits Anthropic = 0

Impacte (HTTP 429/401) :
- `/api/chat` (Agent Manager Haiku 4.5)
- `skills/landing-analyzer.ts` (Sonnet 4)
- `skills/ab-test-generator.ts` (Sonnet 4)

N'impacte **pas** :
- 7 skills hardcodés (zéro IA, donc continuent à produire le contenu fictif)
- 8 agents autonomes (zéro IA)
- `image-generator` (Replicate, pas Anthropic)

→ **Si Anthropic est à 0, le `content-agent` continue son cycle 12h et envoie les emails d'approbation chargés d'inventions.** C'est précisément le scénario actuel.

---

# LIVRABLE 3 — RÉORGANISATION PROPOSÉE

## A. Tableau AVANT / APRÈS

| Agent | Mission | Skills actuels | Skills proposés | Justification |
|---|---|---|---|---|
| **content** | Cycle 12h création contenu | brief-crea (hardcoded) → ad-creative-generator (hardcoded) → image-generator (FLUX, prompts hardcoded) → infographic-generator (Napkin, hardcoded) → post-social (hardcoded) → 3 emails approbation | brand-knowledge (nouveau) → brief-crea **IA-grounded** → ad-creative-generator **IA-grounded** → image-generator (FLUX, prompts grounded) → ~~infographic-generator~~ (FUSIONNÉ avec image) → post-social **IA-grounded** → **claim-validator (nouveau)** → emails approbation | Élimine le hardcoding qui produit prix/produit/témoignages faux. Le claim-validator bloque l'envoi si charte EFSA non respectée. Fusion image/infographic supprime une redondance Napkin↔FLUX |
| **crea** | Analyse perfs créatives Meta 14j | aucun (heuristique pure) | aucun + 1 sortie verbatim IA "angle gagnant à itérer" | Bonne base ; juste enrichir le verbatim final pour brief-crea |
| **growth** | Rapport quotidien + 3 actions | aucun | aucun (utiliser `rapport-hebdo` au niveau hebdo, supprimer redondance) | OK, mais clarifier scope vs rapport-hebdo |
| **shopify** / **sendcloud** / **ga4** / **meta-ads** / **email-crm** | Surveillance heuristique multi-source | aucun | aucun (RAS) | Agents de monitoring, hors-sujet de la charte copy |
| **agent-manager** (chat) | Orchestrateur conversationnel | 10 tools dans tools.ts | 10 tools + **brand-knowledge injecté en system prompt** + **suppression fallback mock silencieux** + bandeau "données indisponibles" si APIs KO | Élimine la cause racine du bug "chat invente des chiffres" |

## B. Skills à AJOUTER

### 1. `skills/brand-knowledge.ts` (utilitaire non-LLM)

Exporte `UBURN_BRAND_PROMPT` (chaîne markdown) :

- Produit : poudre Uburn, jar, dosage, préparation à l'eau
- Prix officiels : 34.50 € / 54.50 €
- USP : satiété 4h via glucomannane (claim EFSA), 30 kcal/portion, 0 % caféine
- 6 ingrédients : konjac (glucomannane), MCT coco, L-carnitine tartrate, fibre acacia, gingembre, ube violet bio
- Cible : Femmes 35-55, France, anti-snacking
- Mots interdits : brûle-graisses, minceur, maigrir, healthy, café vert, "satisfait ou remboursé 30 jours"
- Mots obligatoires : citer ≥1 ingrédient officiel + ≥1 claim officielle

Importé par : `chat/route.ts` (system prompt), `landing-analyzer.ts`, `ab-test-generator.ts`, `image-generator.ts` (UBURN_BRAND_CONTEXT à compléter), tous les futurs skills IA.

### 2. `skills/claim-validator.ts` (skill final, non-LLM ou LLM léger)

Reçoit un texte. Renvoie `{ valid, violations[], suggestions[] }`.
- Détecte mots interdits → rejet hard
- Détecte claims santé non autorisées (anti-inflammatoire, anti-stress, sérotonine, etc.) → rejet
- Vérifie présence d'≥1 ingrédient officiel + ≥1 claim officielle → rejet sinon
- Vérifie cohérence prix (`/29\.90|39\.90|23\.90/` → flag)
- Vérifie cohérence produit (`/bottle|bouteille/` → flag, doit être "jar"/"poudre")

Inséré dans `content-agent` **juste avant `sendApprovalNotification`**. Si `valid=false`, passer en mode "draft à corriger" + log Supabase, ne **pas** envoyer l'email.

### 3. `skills/data-source-strict.ts` (utilitaire)

Wrapper qui **lance une exception** si l'API échoue, au lieu de fallback mock. Mock disponible explicitement via `?mock=1` query param ou `NODE_ENV=development`. Banner UI "données indisponibles, dernière sync : X" côté front.

## C. 5 actions prioritaires (ordonnées)

### 1. Créer `brand-knowledge.ts` + injecter dans les 3 skills IA et le SYSTEM_PROMPT du chat — **S (4 h) — Impact ÉLEVÉ**

- Fichiers : `src/services/skills/brand-knowledge.ts` (nouveau), [src/app/api/chat/route.ts](src/app/api/chat/route.ts) (concaténer dans `SYSTEM_PROMPT`), [src/services/skills/landing-analyzer.ts](src/services/skills/landing-analyzer.ts) (remplacer L101-104), [src/services/skills/ab-test-generator.ts](src/services/skills/ab-test-generator.ts) (remplacer L101-105), [src/services/skills/image-generator.ts](src/services/skills/image-generator.ts) (compléter `UBURN_BRAND_CONTEXT` L61).
- **Impact** : élimine le prix faux (29 €) injecté dans Claude pour les 2 skills CRO ; donne au chat les ingrédients/claims/cible/interdits ; fait disparaître les "glass bottle" générés par FLUX.

### 2. Réécrire les 5 skills hardcodés en IA-grounded — **L (12 h) — Impact MAXIMAL**

- Fichiers : [ad-creative-generator.ts](src/services/skills/ad-creative-generator.ts), [brief-crea.ts](src/services/skills/brief-crea.ts), [infographic-generator.ts](src/services/skills/infographic-generator.ts), [post-social.ts](src/services/skills/post-social.ts), [email-sequence.ts](src/services/skills/email-sequence.ts).
- Pattern : remplacer chaque `const adVariations: AdCreative[] = [ /* littéraux */ ]` par `anthropic.messages.create({ model: "claude-haiku-4-5-20251001", system: UBURN_BRAND_PROMPT + perfs réelles, messages: [...] })`.
- Modèle recommandé : Haiku 4.5 (3-5x plus rapide, fits Vercel 60s, suffisant pour ce niveau de copy).
- **Impact** : supprime "+2000 français", témoignages "Marine 28 ans", "Pack 6 bouteilles 23.90€", "anti-inflammatoire", "boost humeur" — tout ce contenu sera regénéré à partir de la vraie fiche produit.

### 3. Ajouter `claim-validator` dans `content-agent` avant l'envoi des emails — **M (4 h) — Impact ÉLEVÉ**

- Fichiers : `src/services/skills/claim-validator.ts` (nouveau), [content-agent.ts](src/services/agents/content-agent.ts) (intégration entre L94 et L105).
- Si `valid=false` : passer en mode `status: "draft_pending_correction"`, écrire log Supabase, **ne pas** appeler `sendApprovalNotification`.
- **Impact** : filet de sécurité sur les outputs résiduels, surface visible pour Charles (queue de drafts à corriger).

### 4. Supprimer le fallback mock silencieux (chat + APIs internes) — **S (2 h) — Impact ÉLEVÉ**

- Fichiers : [chat/route.ts](src/app/api/chat/route.ts) (`gatherBusinessContext` L28-46), [src/app/api/shopify/route.ts](src/app/api/shopify/route.ts), [src/app/api/meta-ads/route.ts](src/app/api/meta-ads/route.ts), [src/app/api/ga4/route.ts](src/app/api/ga4/route.ts), [src/app/api/sendcloud/route.ts](src/app/api/sendcloud/route.ts).
- Remplacer `safeCall(real, mock)` par retour d'objet `{ data?, error?, lastSync, isMock }`.
- Côté chat : injecter dans le SYSTEM_PROMPT les sources qui sont actuellement en mock pour que Claude refuse d'inventer.
- **Impact** : élimine la cause #1 du bug "chat invente des chiffres".

### 5. Refresh automatique du token Shopify — **M (4 h) — Impact ÉLEVÉ**

- Fichiers : `src/services/api/shopify-auth.ts` (nouveau wrapper `client_credentials`), [src/services/api/shopify.ts](src/services/api/shopify.ts) (utiliser le wrapper), Cloud Scheduler nouveau cron 12h.
- Stocker le token dans Supabase (table `secrets`) avec `expires_at`. Cron refresh à T-1h.
- **Impact** : évite que toute la chaîne dépendante de Shopify retombe sur mock après 24h, ce qui est exactement le scénario actuel depuis ~16 jours.

---

## Synthèse exécutive

Le système n'est pas un système d'agents IA. C'est un **orchestrateur de littéraux TypeScript** (7 skills sur 10) déclenché par cron, dont le contenu textuel a été figé en avril 2026 sans charte produit, avec un seul vrai composant IA (le chat) qui ment silencieusement quand les APIs externes tombent.

Les "outputs médiocres / fictifs / hors charte" ne sont pas une conséquence de mauvais prompts ou de modèles trop petits — c'est la conséquence de **contenu hardcoded jamais relu par un humain qui connaît le produit Uburn**. La régénération ne change rien tant que les 5 fichiers de skills (`ad-creative-generator`, `brief-crea`, `infographic-generator`, `post-social`, `email-sequence`) ne passent pas d'arrays littéraux à appels Anthropic grounded sur `brand-knowledge.ts`.

Action #1 et #2 (8-16 h cumulé) traitent **80 %** du problème. Action #4 ferme la fuite mock du chat. Actions #3 et #5 sont des filets de sécurité opérationnels.
