UPDATE units u SET status = 'occupied'
WHERE status = 'vacant'
  AND EXISTS (SELECT 1 FROM tenants t WHERE t.unit_id = u.id AND t.is_active = true);