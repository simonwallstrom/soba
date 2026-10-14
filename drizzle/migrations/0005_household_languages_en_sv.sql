-- Households can now choose only English or Swedish; the other languages become English.
UPDATE `household` SET `language` = 'en' WHERE `language` NOT IN ('en', 'sv');
