Evolution no teu host (sem duplicar o repo da Evolution)
========================================================

1) Coloca esta pasta no servidor (ou só o docker-compose.yml + .env).

2) cp env.example .env
   - AUTHENTICATION_API_KEY: mesma valor que vais meter no Supabase como EVOLUTION_GLOBAL_KEY.
   - SERVER_URL: URL pública com que o browser / Supabase Edge alcançam a API (HTTPS atrás de Nginx/Caddy).

3) docker compose up -d

4) Supabase → Edge Functions → Secrets:
     EVOLUTION_API_URL = mesma base que SERVER_URL (sem / no fim)
     EVOLUTION_GLOBAL_KEY = AUTHENTICATION_API_KEY

5) Deploy da função evolution-api (ver supabase/manual/evolution_edge_setup.txt).

Nota: a Edge Function corre na cloud do Supabase; EVOLUTION_API_URL não pode ser
http://localhost:8080 em produção — tem de ser um host acessível da internet.
