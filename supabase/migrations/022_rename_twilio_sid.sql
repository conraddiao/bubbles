-- Rename twilio_sid → provider_message_id to be provider-agnostic
ALTER TABLE sms_notifications
  RENAME COLUMN twilio_sid TO provider_message_id;
