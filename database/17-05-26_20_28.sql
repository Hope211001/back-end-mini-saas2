DROP VIEW IF EXISTS leads_with_cookies;

CREATE VIEW leads_with_cookies AS
SELECT 
  l.id          AS lead_id,
  l.lbc_id,
  l.url,
  l.phone,
  l.statut,
  l.zone_id,
  l.assigned_user_id,
  l.date_detection,
  z.owner_id,
  z.auto_contact_enabled,
  z.template_message,
  c.mail_leboncoin       AS user_email,
  c.password_leboncoin    AS user_password,
  c.cookies::jsonb AS user_cookies
FROM leads l
INNER JOIN zones z 
  ON z.id = l.zone_id
  AND z.auto_contact_enabled = TRUE
INNER JOIN cookies c 
  ON c.user_id = z.owner_id
WHERE l.statut = 'new';
