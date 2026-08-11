# Comptes de test — NOLI

| Rôle    | Email              | Mot de passe |
| ------- | ------------------ | ------------ |
| Admin   | admin@noli.ci      | Admin@2025   |
| Utilisateur | user@test.ci    | User@2025    |
| Assureur    | assureur@saham.ci | Assureur@2025 |

> Ces comptes proviennent du **seed** (`supabase/seed.sql`) : ils ne sont
> présents que si le seed a été appliqué sur la base. Sur une base vierge, il
> faut d'abord charger le seed (les mots de passe sont hachés côté SQL et les
> profils/rôles associés — dont le rattachement de `assureur@saham.ci` à la
> compagnie SAHAM — y sont créés). Les mots de passe ci-dessus correspondent
> exactement aux valeurs du seed.