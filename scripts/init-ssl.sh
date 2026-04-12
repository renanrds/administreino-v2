#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# init-ssl.sh — Configura SSL com Let's Encrypt pela primeira vez
#
# Uso:
#   ./scripts/init-ssl.sh <domain> <email>
#   Exemplo: ./scripts/init-ssl.sh app.seudominio.com admin@seudominio.com
#
# O que faz:
#   1. Cria diretórios para certbot
#   2. Gera certificado auto-assinado temporário para o Nginx subir
#   3. Substitui YOUR_DOMAIN no nginx.conf pelo domínio real
#   4. Sobe db + backend + nginx
#   5. Obtém certificado real via Let's Encrypt (webroot challenge)
#   6. Recarrega o Nginx com o certificado real
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="${1}"
EMAIL="${2}"
COMPOSE="docker compose -f docker-compose.prod.yml"

# ── Validação ─────────────────────────────────────────────────────────────────
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Uso: $0 <domain> <email>"
  echo "  Exemplo: $0 app.seudominio.com admin@seudominio.com"
  exit 1
fi

if [ ! -f ".env.prod" ]; then
  echo "ERRO: Arquivo .env.prod não encontrado."
  echo "Copie .env.prod.example para .env.prod e preencha os valores."
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Configurando SSL para: $DOMAIN"
echo "  E-mail Let's Encrypt:  $EMAIL"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Step 1: Criar diretórios ──────────────────────────────────────────────────
echo ">> Criando diretórios certbot..."
mkdir -p "nginx/certbot/conf/live/${DOMAIN}"
mkdir -p "nginx/certbot/www"

# ── Step 2: Certificado auto-assinado temporário ──────────────────────────────
echo ">> Gerando certificado temporário (auto-assinado)..."
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "nginx/certbot/conf/live/${DOMAIN}/privkey.pem" \
  -out    "nginx/certbot/conf/live/${DOMAIN}/fullchain.pem" \
  -subj   "/CN=${DOMAIN}" \
  2>/dev/null

# ── Step 3: Substituir YOUR_DOMAIN no nginx.conf ─────────────────────────────
echo ">> Configurando nginx.conf para domínio: $DOMAIN..."
# Faz backup antes de substituir
cp nginx/nginx.conf nginx/nginx.conf.bak
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" nginx/nginx.conf

# ── Step 4: Subir serviços ────────────────────────────────────────────────────
echo ">> Subindo db, backend e nginx..."
$COMPOSE up -d db backend nginx

echo ">> Aguardando serviços ficarem prontos (15s)..."
sleep 15

# ── Step 5: Obter certificado real ───────────────────────────────────────────
echo ">> Solicitando certificado Let's Encrypt para $DOMAIN..."
$COMPOSE run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# ── Step 6: Recarregar Nginx ──────────────────────────────────────────────────
echo ">> Recarregando Nginx com certificado real..."
$COMPOSE exec nginx nginx -s reload

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  SSL configurado com sucesso!"
echo "  Acesse: https://${DOMAIN}"
echo "  API:    https://${DOMAIN}/api/docs/"
echo ""
echo "  Para renovação automática, adicione ao cron (crontab -e):"
echo "  0 12 * * * cd $(pwd) && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload >> /var/log/certbot-renew.log 2>&1"
echo "═══════════════════════════════════════════════════════"
