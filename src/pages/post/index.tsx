import type { FC, KeyboardEvent, RefObject } from 'react';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { fromEvent } from 'rxjs';
import type { Post } from '@/type/Post';
import { Link } from '@/components/Link';
import type { LayoutFC } from '@/type/GlobalContext';
import { UserLayout } from '@/layout/UserLayout';
import { DateTimeFormat } from '@/utils/lib';
import { LazyAssetImage } from '@/components/LazyImage/LazyAssetImage';
import { useHistory } from '@/hooks/useHistory';
import { useHiddenHtmlOverflow } from '@/hooks/useHiddenHtmlOverflow';
import { requestAtServer } from '@/utils/server';
import { isString } from '@powerfulyang/utils';
import { useIsomorphicLayoutEffect } from '@powerfulyang/hooks';
import { Skeleton } from '@/components/Skeleton';
import { useQuery } from 'react-query';
import { requestAtClient } from '@/utils/client';
import { LazyMarkdownContainer } from '@/components/MarkdownContainer/lazy';
import styles from './index.module.scss';

export type Props = {
  selectedPost?: Post;
  containerRef: RefObject<HTMLDivElement>;
  hiddenPost: () => void;
};

const PostPreview: FC<Props> = ({ selectedPost, containerRef, hiddenPost }) => {
  const [show, setShow] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (!selectedPost) {
      setShow(false);
    }
  }, [selectedPost]);

  const { data: source } = useQuery(
    ['post', selectedPost?.id],
    () => {
      return requestAtClient<Post>(`/public/post/${selectedPost!.id}`);
    },
    {
      enabled: show && !!selectedPost,
      select(v) {
        return v.data.content;
      },
    },
  );
  return useMemo(() => {
    return (
      <AnimatePresence>
        {selectedPost && (
          <>
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.8 }}
            />
            <motion.div
              className={classNames(styles.postPreview, 'pointer')}
              ref={containerRef}
              onClick={hiddenPost}
              key={selectedPost.id}
            >
              <motion.div
                onLayoutAnimationComplete={() => {
                  setShow(true);
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 50,
                }}
                layoutId={`post-container-${selectedPost.id}`}
                className={classNames(styles.container, 'default')}
              >
                <motion.div className={styles.image} layoutId={`post-poster-${selectedPost.id}`}>
                  <LazyAssetImage
                    draggable={false}
                    onTap={hiddenPost}
                    thumbnail={false}
                    lazy={false}
                    asset={selectedPost.poster}
                  />
                </motion.div>
                <motion.div
                  layout="position"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className={styles.content}
                  layoutId={`post-content-${selectedPost.id}`}
                >
                  <Suspense fallback={<Skeleton rows={8} />}>
                    {show && source ? (
                      <LazyMarkdownContainer blur={false} source={source} />
                    ) : (
                      <Skeleton rows={8} />
                    )}
                  </Suspense>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }, [containerRef, hiddenPost, selectedPost, show, source]);
};

type IndexProps = {
  posts: Post[];
  years: number[];
  year: number;
};

const Index: LayoutFC<IndexProps> = ({ posts, years, year }) => {
  const history = useHistory();
  const { id } = history.router.query;
  const [selectedPostId, setSelectedPostId] = useState(0);
  useIsomorphicLayoutEffect(() => {
    if (isString(id)) {
      const postId = parseInt(id, 10);
      setSelectedPostId(postId);
    } else {
      setSelectedPostId(0);
    }
  }, [id]);
  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId),
    [posts, selectedPostId],
  );

  const ref = useRef<HTMLDivElement>(null);

  useHiddenHtmlOverflow(Boolean(selectedPostId));

  const showPost = useCallback(
    (postId: number) => {
      if (ref.current) {
        ref.current.style.pointerEvents = 'auto';
      }
      return history.router.push(
        {
          pathname: `/post/thumbnail/${postId}`,
          query: {
            year: String(year),
          },
        },
        undefined,
        { shallow: true },
      );
    },
    [history.router, year],
  );

  const hiddenPost = useCallback(() => {
    if (ref.current) {
      ref.current.style.pointerEvents = 'none';
    }
    return history.router.push(
      {
        pathname: '/post',
        query: {
          year: String(year),
        },
      },
      undefined,
      { shallow: true },
    );
  }, [history.router, year]);

  useEffect(() => {
    const sub = fromEvent<KeyboardEvent>(document, 'keydown').subscribe((e) => {
      if (e.key === 'Escape' && selectedPostId) {
        return hiddenPost();
      }
      if (e.key === '.') {
        if (selectedPostId) {
          return history.pushState(`/post/publish/${selectedPostId}`);
        }
        return history.pushState('/post/publish');
      }
      return null;
    });
    return () => {
      sub.unsubscribe();
    };
  }, [hiddenPost, history, selectedPostId]);

  return (
    <>
      <div className={styles.body}>
        <main className={styles.main}>
          <div className={classNames(styles.years)} role="tablist">
            {years.map((x) => (
              <Link role="tab" key={x} href={`?year=${x}`}>
                <span
                  className={classNames(styles.year, 'pr-1', {
                    [styles.active]: x === year,
                  })}
                >
                  #{x}
                </span>
              </Link>
            ))}
          </div>
          <section className="m-auto flex w-[100%] max-w-[1000px] flex-wrap">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                title={`${post.id}`}
                className={classNames('pointer', styles.card)}
                onTap={(e) => {
                  const pointerEvent = e as PointerEvent;
                  if (pointerEvent.pointerType === 'mouse') {
                    if (e.metaKey || e.ctrlKey) {
                      return history.pushState(`/post/${post.id}`);
                    }
                    return showPost(post.id);
                  }
                  return history.pushState(`/post/${post.id}`);
                }}
              >
                <AnimatePresence initial={false}>
                  {selectedPostId !== post.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={styles.cardHeader}
                    >
                      <div className={styles.cardHeaderTitle}>
                        <div>{post.title}</div>
                        <div className={styles.cardHeaderDate}>{DateTimeFormat(post.createAt)}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  layoutId={`post-container-${post.id}`}
                  className={classNames(styles.container)}
                >
                  <motion.a
                    onClick={(e) => e.preventDefault()}
                    className={styles.image}
                    layoutId={`post-poster-${post.id}`}
                    href={`/post/${post.id}`}
                    draggable={false}
                  >
                    <LazyAssetImage draggable={false} thumbnail={false} asset={post.poster} />
                  </motion.a>
                  <motion.div className={styles.content} layoutId={`post-content-${post.id}`}>
                    <Skeleton rows={8} />
                  </motion.div>
                </motion.div>
              </motion.div>
            ))}
          </section>
        </main>
      </div>
      <PostPreview hiddenPost={hiddenPost} selectedPost={selectedPost} containerRef={ref} />
    </>
  );
};

Index.getLayout = (page) => {
  const { pathViewCount } = page.props;
  return <UserLayout pathViewCount={pathViewCount}>{page}</UserLayout>;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { query } = ctx;
  const tmp = await requestAtServer('/public/post/years', {
    ctx,
  });
  const { data: years = [] } = await tmp.json();
  const year = Number(query.year) || years[0] || new Date().getFullYear();
  const res = await requestAtServer('/public/post', {
    ctx,
    query: { publishYear: year },
  });
  const { data, pathViewCount } = await res.json();
  return {
    props: {
      pathViewCount,
      years,
      posts: data,
      year,
      title: '日志',
    },
  };
};

export default Index;
