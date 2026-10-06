import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function TreeImage({
  path,
  alt,
  className,
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSrc(null);
    if (!path) return () => { active = false; };

    if (/^https?:\/\//i.test(path)) {
      setSrc(path);
      return () => { active = false; };
    }
    if (!supabase) return () => { active = false; };

    void supabase.storage
      .from('tree-images')
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (active && !error) setSrc(data.signedUrl);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => { active = false; };
  }, [path]);

  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setSrc(null)}
    />
  );
}
