import React from 'react';
import { BRANDING } from '../config';

const Footer = () => (
  <div className="py-3 text-center bg-transparent shrink-0 w-full">
    <p className="text-[11px] font-medium text-sky-700/80">
      Powered by <span className="font-bold text-sky-600">{BRANDING.poweredBy || 'Acemark'}</span>
    </p>
  </div>
);

export default Footer;
