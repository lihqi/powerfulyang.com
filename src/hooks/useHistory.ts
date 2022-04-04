import { useRouter } from 'next/router';
import { useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { RedirectingAtom } from '@/components/Redirecting';
import { FormDiscardWarningAtom } from '@/hooks/useFormDiscardWarning';

export const useHistory = () => {
  const router = useRouter();
  const [, setIsRedirecting] = useAtom(RedirectingAtom);
  const [formWarning] = useAtom(FormDiscardWarningAtom);
  const confirm = useCallback(
    <T extends Function, P extends Function>(ok?: T, fail?: P) => {
      if (formWarning) {
        // eslint-disable-next-line no-alert
        const bool = window.confirm('您的表单未保存，确定要离开吗？');
        if (bool) {
          return ok?.() || true;
        }
        return fail?.() || false;
      }
      return ok?.() || true;
    },
    [formWarning],
  );
  useEffect(() => {
    router.beforePopState(() => {
      return confirm(undefined, () => {
        router.push(router.asPath, undefined, { shallow: true }).catch(() => {
          throw new Error('拦截跳转出了点小问题!');
        });
        return false;
      });
    });
  }, [formWarning, router, confirm]);
  const pushState = useCallback(
    (...args: Parameters<typeof router.push>) => {
      const push = () => {
        setIsRedirecting(true);
        router.push(args[0], args[1], args[2]).finally(() => {
          setIsRedirecting(false);
        });
      };
      confirm(push);
    },
    [confirm, router, setIsRedirecting],
  );
  return { pushState, replaceState: router.replace, pathname: router.pathname, router };
};
