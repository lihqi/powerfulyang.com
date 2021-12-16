import type { FC } from 'react';
import React from 'react';
import Head from 'next/head';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import { isProdProcess } from '@powerfulyang/utils';
import { Redirecting } from '../Redirecting';
import { ProjectName } from '@/constant/Constant';

dayjs.extend(LocalizedFormat);

export interface HeaderProps {
  title?: string;
}

export const Header: FC<HeaderProps> = ({ title }) => (
  <>
    <Head>
      <title>{`${(title && `${title} - `) || ''}${ProjectName}`}</title>
      <meta
        name="viewport"
        content="initial-scale=1.0, width=device-width,minimum-scale=1.0, maximum-scale=1.0"
      />
      <link rel="manifest" href="/manifest.json" />
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      {isProdProcess && (
        <>
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-Y0JKGR6P0S" />
          <script
            /* eslint-disable-next-line react/no-danger */
            dangerouslySetInnerHTML={{
              __html:
                'window.dataLayer = window.dataLayer || [];\n' +
                '  function gtag(){dataLayer.push(arguments);}\n' +
                "  gtag('js', new Date());\n" +
                '\n' +
                "  gtag('config', 'G-Y0JKGR6P0S');",
            }}
          />
        </>
      )}
    </Head>
    <Redirecting />
  </>
);
