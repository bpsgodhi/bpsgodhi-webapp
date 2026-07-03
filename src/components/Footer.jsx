import React from 'react';
import { BRANDING } from '../config';

const Footer = () => {
  const name = BRANDING.poweredBy || 'Mbjare';
  const url = BRANDING.poweredByUrl;
  return (
    <div className="py-3 text-center bg-transparent shrink-0 w-full">
      <p className="text-[11px] font-medium text-sky-700/80">
        Powered by{' '}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors"
          >
            {name}
          </a>
        ) : (
          <span className="font-bold text-sky-600">{name}</span>
        )}
      </p>
    </div>
  );
};

export default Footer;
