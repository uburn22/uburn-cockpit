# UBURN COCKPIT

## Projet
Dashboard cockpit e-commerce pour Uburn (boisson wellness française à base d'ube).
Objectif : piloter l'acquisition pour atteindre 100 commandes/jour.

## Stack
- Next.js avec SSR
- Supabase (BDD temps réel)
- Déploiement Google Cloud Run

## Règles
- Utiliser /browse pour toute navigation web
- Ne jamais utiliser mcp__claude-in-chrome__*
- Plan Mode obligatoire pour tout changement structurant
- Design : noir, blanc, or (#C9A84C) — menu fixe gauche

## Sources de données
- Shopify Admin API (orders, products, customers)
- Meta Marketing API (account act_818944730982350)
- GA4 Data API (sessions, attribution, new vs returning)

## Modules
1. Revenue Intelligence : CA/jour, panier moyen, commandes, progression 100 cmd/jour
2. Ads Performance : ROAS par créa, CPO, dépense/jour, CTR
3. Audience Health : taux de repeat, LTV, CAC, cohortes
4. Weekly Signal : alertes auto, 3 actions prioritaires
