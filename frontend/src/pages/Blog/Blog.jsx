
import { useTranslation } from 'react-i18next';
import styles from './Blog.module.scss';


const Blog = () => {
  const { t } = useTranslation();
  const blogPosts = [
    {
      id: 1,
      title: t('blogPost1Title'),
      excerpt: t('blogPost1Excerpt'),
      date: '2024-01-15',
      author: t('blogPost1Author'),
      category: t('blogPost1Category')
    },
    {
      id: 2,
      title: t('blogPost2Title'),
      excerpt: t('blogPost2Excerpt'),
      date: '2024-01-10',
      author: t('blogPost2Author'),
      category: t('blogPost2Category')
    },
    {
      id: 3,
      title: t('blogPost3Title'),
      excerpt: t('blogPost3Excerpt'),
      date: '2024-01-05',
      author: t('blogPost3Author'),
      category: t('blogPost3Category')
    }
  ];

  return (
    <div className={styles.blogContainer}>
      <div className={styles.blogHeader}>
        <h1 className={styles.blogTitle}>{t('smartCityBlog')}</h1>
        <p className={styles.blogSubtitle}>
          {t('blogSubtitle')}
        </p>
      </div>

      <div className={styles.blogGrid}>
        {blogPosts.map((post) => (
          <article key={post.id} className={styles.blogCard}>
            <div className={styles.blogCardHeader}>
              <span className={styles.blogCategory}>{post.category}</span>
              <span className={styles.blogDate}>{post.date}</span>
            </div>
            <h2 className={styles.blogCardTitle}>{post.title}</h2>
            <p className={styles.blogCardExcerpt}>{post.excerpt}</p>
            <div className={styles.blogCardFooter}>
              <span className={styles.blogAuthor}>{t('by')} {post.author}</span>
              <button className={styles.readMoreBtn}>{t('readMore')}</button>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.blogCta}>
        <h2>{t('wantToContribute')}</h2>
        <p>{t('shareIdeas')}</p>
        <button className="btn btn-primary">{t('submitArticle')}</button>
      </div>
    </div>
  );
};

export default Blog; 