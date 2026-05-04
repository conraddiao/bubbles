-- Rename twilio_sid to provider_message_id now that we use Surge for messaging
ALTER TABLE sms_notifications
  RENAME COLUMN twilio_sid TO provider_message_id;
