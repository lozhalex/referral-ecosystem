/**
 * Утилита для нормализации и валидации телефонов
 * Поддерживаются только номера РФ (+7)
 */

/**
 * Нормализует номер телефона к формату +7XXXXXXXXXX
 * Принимает: 89XXXXXXXXX, +79XXXXXXXXX, 79XXXXXXXXX, 8 (9XX) XXX-XX-XX и т.д.
 * Возвращает: +79XXXXXXXXXX или null если номер невалиден
 */
export function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Удаляем все символы кроме цифр
  const digits = phone.replace(/\D/g, '');

  // Проверяем длину (должно быть 10 или 11 цифр)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  let normalized = '';

  if (digits.length === 11) {
    // 11 цифр: должно начинаться с 7 или 8
    if (digits[0] === '7' || digits[0] === '8') {
      normalized = '+7' + digits.slice(1);
    } else {
      // Не российский код
      return null;
    }
  } else if (digits.length === 10) {
    // 10 цифр: добавляем +7 в начало
    normalized = '+7' + digits;
  }

  // Проверяем, что номер начинается с +79 (мобильные РФ)
  if (!normalized.startsWith('+79')) {
    return null;
  }

  // Финальная проверка: должно быть ровно 12 символов (+7 + 10 цифр)
  if (normalized.length !== 12) {
    return null;
  }

  return normalized;
}

/**
 * Проверяет, является ли номер корневым пользователем
 */
export function isRootUser(phone: string): boolean {
  const rootPhone = process.env.ROOT_USER_PHONE || '+79503278027';
  return phone === rootPhone;
}

/**
 * Маскирует номер телефона для отображения (например, +7 (9XX) XXX-XX-XX)
 */
export function formatPhoneMask(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;

  const digits = normalized.slice(1); // убираем +
  return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}