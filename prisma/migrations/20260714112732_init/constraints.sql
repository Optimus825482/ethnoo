-- GPS range validation
ALTER TABLE locations ADD CONSTRAINT chk_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE locations ADD CONSTRAINT chk_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Single active primary driver per buggy
CREATE UNIQUE INDEX idx_buggy_drivers_primary ON buggy_drivers (buggy_id) WHERE is_primary = true AND is_active = true;

-- One driver active on only one buggy at a time
CREATE UNIQUE INDEX idx_driver_active_buggy ON buggy_drivers (driver_id) WHERE is_active = true;

-- Audit trail immutability (DB trigger)
CREATE OR REPLACE FUNCTION prevent_audit_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail is immutable: UPDATE not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_trail
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();

CREATE OR REPLACE FUNCTION prevent_audit_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail is immutable: DELETE not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_trail
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();
