import React, { useMemo } from 'react';
import type { GetServerSideProps } from 'next';
import { useInfiniteQuery } from 'react-query';
import { flatten } from 'ramda';
import type { LayoutFC } from '@/type/GlobalContext';
import { UserLayout } from '@/layout/UserLayout';
import { requestAtClient } from '@/utils/client';
import type { Asset } from '@/type/Asset';
import { getCurrentUser } from '@/service/getCurrentUser';
import type { InfiniteQueryResponse } from '@/type/InfiniteQuery';
import { LazyAssetImage } from '@/components/LazyImage/LazyAssetImage';
import { ImagePreview } from '@/components/ImagePreview';
import { requestAtServer } from '@/utils/server';
import Masonry from '@/components/Masonry';
import styles from './index.module.scss';

type GalleryProps = {
  assets: Asset[];
  nextCursor: number;
  prevCursor: number;
};

export const Gallery: LayoutFC<GalleryProps> = ({ assets, nextCursor, prevCursor }) => {
  const { data, fetchPreviousPage, hasPreviousPage } = useInfiniteQuery(
    ['assets', assets, nextCursor, prevCursor],
    async ({ pageParam }) => {
      const res = await requestAtClient<InfiniteQueryResponse<Asset>>('/public/asset', {
        query: pageParam,
      });
      return res.data;
    },
    {
      enabled: false,
      getNextPageParam(lastPage) {
        return { nextCursor: lastPage.nextCursor };
      },
      getPreviousPageParam(firstPage) {
        const { prevCursor: cursor } = firstPage;
        if (cursor) {
          return { prevCursor: cursor };
        }
        return cursor;
      },
      select(page) {
        return {
          pages: [...page.pages].reverse(),
          pageParams: [...page.pageParams].reverse(),
        };
      },
      initialData: {
        pages: [
          {
            resources: assets,
            nextCursor,
            prevCursor,
          },
        ],
        pageParams: [{ nextCursor, prevCursor }],
      },
    },
  );

  const resources = useMemo(
    () => flatten(data?.pages.map((x) => x.resources) || []),
    [data?.pages],
  );

  return (
    <main className={styles.gallery}>
      <ImagePreview images={resources}>
        <Masonry
          onLoadMore={() => {
            hasPreviousPage && fetchPreviousPage();
          }}
        >
          {resources.map((asset, index) => (
            <LazyAssetImage
              key={asset.id}
              id={`${asset.id}`}
              tabIndex={index}
              title={`${asset.id}`}
              asset={asset}
              containerClassName="rounded-lg shadow-lg"
              keepAspectRatio
            />
          ))}
        </Masonry>
      </ImagePreview>
    </main>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const res = await requestAtServer('/public/asset', {
    ctx,
    query: {
      size: 30,
    },
  });
  const { data, pathViewCount } = await res.json();
  const user = await getCurrentUser(ctx);
  return {
    props: {
      assets: data.resources,
      nextCursor: data.nextCursor,
      prevCursor: data.prevCursor,
      pathViewCount,
      title: '图片墙',
      user,
    },
  };
};

Gallery.getLayout = (page) => {
  const { pathViewCount, user } = page.props;
  return (
    <UserLayout user={user} pathViewCount={pathViewCount}>
      {page}
    </UserLayout>
  );
};

export default Gallery;
