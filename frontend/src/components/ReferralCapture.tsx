import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function ReferralCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { info } = useToast();

  useEffect(() => {
    const ref = searchParams.get('ref');
    const redirect = searchParams.get('redirect');
    const token = localStorage.getItem('token');

    if (ref) {
      if (token) {
        // Сценарий А: Пользователь уже авторизован
        info('Вы уже в системе. Реферальная ссылка не применена.');
        
        // Очищаем URL от реферальных параметров, чтобы не спамить при обновлении
        const currentPath = window.location.pathname;
        // Если был указан redirect, идём туда, иначе остаёмся на текущем пути
        const targetPath = redirect || currentPath;
        navigate(targetPath, { replace: true });
      } else {
        // Сценарий Б: Пользователь НЕ авторизован
        // Сохраняем реферера и целевую страницу в sessionStorage
        sessionStorage.setItem('pending_ref', ref);
        
        if (redirect) {
          sessionStorage.setItem('pending_redirect', redirect);
        } else {
          // Если redirect не указан, сохраняем текущий путь (например, /auto)
          // Очищаем текущий URL от ref и redirect, чтобы получить чистый путь
          const cleanPath = window.location.pathname + window.location.search
            .replace(/[?&]ref=[^&]+/, '')
            .replace(/[?&]redirect=[^&]+/, '')
            .replace('?&', '?');
          
          sessionStorage.setItem('pending_redirect', cleanPath);
        }
      }
    }
  }, [searchParams, navigate, info]);

  // Этот компонент ничего не рендерит в DOM
  return null;
}