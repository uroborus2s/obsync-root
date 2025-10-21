import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

import SocialCard from '@site/static/img/docusaurus-social-card.png';

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      {/* 使用 Link 组件包裹图片，使其可以点击跳转 */}
      <Link to="/docs/getting-started/introduction" className={styles.featureImageLink}>
        <img 
          src={SocialCard}
          alt="思齐框架特性预览"
          className={styles.featureImage}
        />
      </Link>
    </section>
  );
}